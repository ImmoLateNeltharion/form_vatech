"""
Vatech Raffle Bot
─────────────────
HTTP API  POST /pending       — web form registers a participant (returns token)
          GET  /health        — participant count
          GET  /participants  — list confirmed participants with chat_id (admin)
          POST /notify        — send prize notification to a participant (admin)
Telegram  /start <token>      — welcome screen + button to claim number
          /export             — download participants CSV (admin)
          /count              — how many participants (admin)
          /list               — full list (admin)
          /reset              — clear all participants (admin)
"""

import os, io, csv, sqlite3, random, json, threading, logging, secrets
from http.server import HTTPServer, BaseHTTPRequestHandler
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

BOT_TOKEN  = os.environ["BOT_TOKEN"]
ADMIN_IDS  = [int(x) for x in os.environ.get("ADMIN_IDS", "").split(",") if x.strip()]
DB_PATH    = os.environ.get("DB_PATH", "/data/raffle.db")
API_PORT   = int(os.environ.get("API_PORT", "18824"))

# ── Database ─────────────────────────────────────────────────────────────────

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with sqlite3.connect(DB_PATH) as c:
        c.execute("""
            CREATE TABLE IF NOT EXISTS participants (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                name          TEXT NOT NULL,
                phone         TEXT NOT NULL,
                clinic        TEXT DEFAULT '',
                chat_id       INTEGER,
                registered_at TEXT DEFAULT (datetime('now','localtime'))
            )
        """)
        # migrate: add chat_id column if upgrading from old schema
        try:
            c.execute("ALTER TABLE participants ADD COLUMN chat_id INTEGER")
        except Exception:
            pass
        c.execute("""
            CREATE TABLE IF NOT EXISTS pending (
                token      TEXT PRIMARY KEY,
                name       TEXT NOT NULL,
                phone      TEXT NOT NULL,
                clinic     TEXT DEFAULT '',
                created_at TEXT DEFAULT (datetime('now','localtime'))
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS config (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        """)

def db_add_pending(name: str, phone: str, clinic: str) -> str:
    token = secrets.token_urlsafe(16)
    with sqlite3.connect(DB_PATH) as c:
        c.execute(
            "INSERT INTO pending (token,name,phone,clinic) VALUES (?,?,?,?)",
            (token, name, phone, clinic)
        )
    return token

def db_get_pending(token: str):
    with sqlite3.connect(DB_PATH) as c:
        return c.execute(
            "SELECT name,phone,clinic FROM pending WHERE token=?", (token,)
        ).fetchone()

def db_confirm(token: str, chat_id: int):
    with sqlite3.connect(DB_PATH) as c:
        row = c.execute(
            "SELECT name,phone,clinic FROM pending WHERE token=?", (token,)
        ).fetchone()
        if not row:
            return None
        c.execute("DELETE FROM pending WHERE token=?", (token,))
        c.execute(
            "INSERT INTO participants (name,phone,clinic,chat_id) VALUES (?,?,?,?)",
            (row[0], row[1], row[2], chat_id)
        )
        pid   = c.execute("SELECT last_insert_rowid()").fetchone()[0]
        total = c.execute("SELECT COUNT(*) FROM participants").fetchone()[0]
        return pid, row[0], total

def db_count() -> int:
    with sqlite3.connect(DB_PATH) as c:
        return c.execute("SELECT COUNT(*) FROM participants").fetchone()[0]

def db_list():
    with sqlite3.connect(DB_PATH) as c:
        return c.execute(
            "SELECT id,name,phone,clinic,registered_at FROM participants ORDER BY id"
        ).fetchall()

def db_list_with_chat_id():
    with sqlite3.connect(DB_PATH) as c:
        return c.execute(
            "SELECT id,name,phone,clinic,chat_id,registered_at FROM participants ORDER BY id"
        ).fetchall()

def db_reset():
    with sqlite3.connect(DB_PATH) as c:
        c.execute("DELETE FROM participants")

def db_get_config(key: str) -> str | None:
    with sqlite3.connect(DB_PATH) as c:
        row = c.execute("SELECT value FROM config WHERE key=?", (key,)).fetchone()
        return row[0] if row else None

def db_set_config(key: str, value: str):
    with sqlite3.connect(DB_PATH) as c:
        c.execute("INSERT OR REPLACE INTO config (key,value) VALUES (?,?)", (key, value))

def db_del_config(key: str):
    with sqlite3.connect(DB_PATH) as c:
        c.execute("DELETE FROM config WHERE key=?", (key,))

def is_bot_open() -> tuple[bool, str]:
    """Returns (is_open, reason). If no schedule set → always open."""
    from datetime import datetime, timezone
    open_from  = db_get_config("open_from")
    open_until = db_get_config("open_until")
    if not open_from and not open_until:
        return True, "no_schedule"
    now = datetime.now(timezone.utc)
    if open_from:
        t = datetime.fromisoformat(open_from)
        if t.tzinfo is None:
            t = t.replace(tzinfo=timezone.utc)
        if now < t:
            return False, "not_started"
    if open_until:
        t = datetime.fromisoformat(open_until)
        if t.tzinfo is None:
            t = t.replace(tzinfo=timezone.utc)
        if now > t:
            return False, "expired"
    return True, "ok"

# ── HTTP API ──────────────────────────────────────────────────────────────────

# Bot app reference + its event loop, set before polling starts
_bot_app  = None
_bot_loop = None

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_): pass

    def _send(self, code: int, body: dict):
        data = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            open_ok, reason = is_bot_open()
            self._send(200, {"ok": True, "participants": db_count(),
                             "bot_open": open_ok, "reason": reason})
        elif self.path == "/participants":
            rows = db_list_with_chat_id()
            self._send(200, {"ok": True, "participants": [
                {"id": r[0], "name": r[1], "phone": r[2],
                 "clinic": r[3], "chat_id": r[4], "registered_at": r[5]}
                for r in rows
            ]})
        elif self.path == "/schedule":
            self._send(200, {"ok": True,
                             "open_from":  db_get_config("open_from")  or "",
                             "open_until": db_get_config("open_until") or ""})
        else:
            self._send(404, {"error": "not found"})

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body   = json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            self._send(400, {"error": "invalid json"}); return

        if self.path == "/pending":
            name   = str(body.get("firstName", "")).strip()
            phone  = str(body.get("phone",     "")).strip()
            clinic = str(body.get("clinic",    "")).strip()
            if not name or not phone:
                self._send(400, {"error": "name and phone required"}); return
            open_ok, reason = is_bot_open()
            if not open_ok:
                msg = ("Регистрация ещё не началась." if reason == "not_started"
                       else "Регистрация завершена. Приём заявок закрыт.")
                self._send(403, {"error": "bot_closed", "message": msg}); return
            token = db_add_pending(name, phone, clinic)
            log.info("pending: %s %s → token %s", name, phone, token)
            self._send(200, {"ok": True, "token": token})

        elif self.path == "/schedule":
            open_from  = str(body.get("open_from",  "")).strip()
            open_until = str(body.get("open_until", "")).strip()
            if open_from:
                db_set_config("open_from", open_from)
            else:
                db_del_config("open_from")
            if open_until:
                db_set_config("open_until", open_until)
            else:
                db_del_config("open_until")
            open_ok, _ = is_bot_open()
            log.info("schedule updated: from=%s until=%s open=%s", open_from, open_until, open_ok)
            self._send(200, {"ok": True, "open_from": open_from, "open_until": open_until, "bot_open": open_ok})

        elif self.path == "/reset":
            n = db_count()
            db_reset()
            log.info("HTTP reset: deleted %d participants", n)
            self._send(200, {"ok": True, "deleted": n})

        elif self.path == "/notify":
            chat_id     = body.get("chat_id")
            prize_name  = str(body.get("prize_name",  "")).strip()
            winner_name = str(body.get("winner_name", "")).strip()
            if not chat_id or not prize_name:
                self._send(400, {"error": "chat_id and prize_name required"}); return
            if _bot_app is None or _bot_loop is None:
                self._send(503, {"error": "bot not ready"}); return
            import asyncio
            async def _send_msg():
                keyboard = InlineKeyboardMarkup([[
                    InlineKeyboardButton("✅ Подтверждаю участие", callback_data="confirm_night")
                ]])
                await _bot_app.bot.send_message(
                    chat_id=int(chat_id),
                    text=(
                        f"🌙 *Вы приглашены на Vatech Night*\n\n"
                        f"Поздравляем — вы в числе гостей 🎉\n\n"
                        f"Вы получаете билет на закрытое вечернее мероприятие: "
                        f"музыка, нетворкинг и особая атмосфера вне основной программы выставки\\.\n\n"
                        f"Пожалуйста, подтвердите участие в течение 2 часов:\n"
                        f"👇\n\n"
                        f"После этого билет может быть передан следующему участнику\\.\n\n"
                        f"До встречи на Vatech Night ✨"
                    ),
                    parse_mode="MarkdownV2",
                    reply_markup=keyboard,
                )
            try:
                future = asyncio.run_coroutine_threadsafe(_send_msg(), _bot_loop)
                future.result(timeout=10)
                log.info("notify: chat_id=%s prize='%s'", chat_id, prize_name)
                self._send(200, {"ok": True})
            except Exception as e:
                log.error("notify error: %s", e)
                self._send(200, {"ok": True, "warning": str(e)})

        elif self.path.startswith("/broadcast/"):
            kind = self.path.split("/broadcast/")[1]
            if kind not in ("announce", "hour", "launch"):
                self._send(404, {"error": "unknown broadcast type"}); return
            if _bot_app is None or _bot_loop is None:
                self._send(503, {"error": "bot not ready"}); return
            rows = db_list_with_chat_id()
            targets = [r[4] for r in rows if r[4]]
            if not targets:
                self._send(200, {"ok": True, "sent": 0, "warning": "no confirmed participants"}); return
            import asyncio
            TEXT = {
                "announce": (
                    "🌙 *Vatech Night 28 мая \\(4 билета\\) — доступ ограничен*\n\n"
                    "Совсем скоро мы разыграем билеты на закрытое вечернее мероприятие в рамках выставки\\.\n\n"
                    "Это не просто вечер — это музыка, профессиональный нетворкинг "
                    "и возможность стать частью Vatech Family\\.\n\n"
                    "Проверьте, что вы выполнили все условия участия\\. "
                    "Количество мест строго ограничено\\."
                ),
                "hour": (
                    "⏰ *1 час до Vatech Night*\n\n"
                    "Финальный момент перед розыгрышем\\.\n\n"
                    "Убедитесь, что вы: ✔ участвуете ✔ выполнили все условия ✔ подписаны на наш Telegram\\-канал\n\n"
                    "Через час мы определим, кто получит приглашение в закрытый круг гостей вечера\\."
                ),
                "launch": (
                    "🎉 *Запускаем розыгрыш Vatech Night*\n\n"
                    "Прямо сейчас рандомайзер определяет гостей закрытого вечера\\.\n\n"
                    "Уже через несколько минут станет ясно, кто получит доступ к атмосфере Vatech Night: "
                    "музыка, общение и профессиональное окружение\\."
                ),
            }
            msg = TEXT[kind]
            async def _broadcast():
                ok = 0
                for cid in targets:
                    try:
                        await _bot_app.bot.send_message(chat_id=cid, text=msg, parse_mode="MarkdownV2")
                        ok += 1
                    except Exception as e:
                        log.warning("broadcast skip chat_id=%s: %s", cid, e)
                return ok
            try:
                future = asyncio.run_coroutine_threadsafe(_broadcast(), _bot_loop)
                sent = future.result(timeout=60)
                log.info("broadcast/%s: sent to %d/%d", kind, sent, len(targets))
                self._send(200, {"ok": True, "sent": sent, "total": len(targets)})
            except Exception as e:
                log.error("broadcast error: %s", e)
                self._send(500, {"error": str(e)})

        else:
            self._send(404, {"error": "not found"})


def run_api():
    srv = HTTPServer(("0.0.0.0", API_PORT), Handler)
    log.info("API server listening on port %d", API_PORT)
    srv.serve_forever()

# ── Telegram handlers ─────────────────────────────────────────────────────────

def is_admin(uid: int) -> bool:
    return (not ADMIN_IDS) or (uid in ADMIN_IDS)

def admin_only(fn):
    async def wrapper(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
        if not is_admin(update.effective_user.id):
            await update.message.reply_text("❌ Нет доступа")
            return
        await fn(update, ctx)
    return wrapper

async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    args = ctx.args
    if args:
        token = args[0]
        row = db_get_pending(token)
        if row is None:
            await update.message.reply_text(
                "😕 Эта ссылка уже использована или недействительна.\n\n"
                "Если вы ещё не получили номер — заполните форму на стенде заново."
            )
            return

        name = row[0]
        ctx.user_data["pending_token"] = token

        keyboard = InlineKeyboardMarkup([[
            InlineKeyboardButton("🎟 Получить номер участника", callback_data="claim")
        ]])
        await update.message.reply_text(
            f"👋 Привет, *{name}*!\n\n"
            f"Вы зарегистрированы на стенде *Vatech*.\n\n"
            f"Нажмите кнопку ниже, чтобы подтвердить участие в розыгрыше "
            f"*Vatech Night* — закрытого вечернего мероприятия 🌙",
            parse_mode="Markdown",
            reply_markup=keyboard,
        )
    else:
        await update.message.reply_text(
            "🌙 *Vatech Night — Розыгрыш билетов*\n\n"
            "Для участия заполните анкету на стенде Vatech и перейдите по ссылке из формы.\n\n"
            "Розыгрыш *4 билетов* состоится 28 мая. Удачи! 🍀",
            parse_mode="Markdown",
        )

async def callback_claim(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    token = ctx.user_data.get("pending_token")
    if not token:
        await query.edit_message_text(
            "😕 Не удалось найти вашу регистрацию.\n"
            "Попробуйте перейти по ссылке из формы ещё раз."
        )
        return

    chat_id = query.from_user.id
    result = db_confirm(token, chat_id)
    ctx.user_data.pop("pending_token", None)

    if result is None:
        await query.edit_message_text(
            "😕 Номер уже был выдан или регистрация не найдена.\n"
            "Если вы ещё не участвуете — заполните форму на стенде заново."
        )
        return

    pid, name, total = result
    log.info("confirmed: %s → participant #%d (total %d)", name, pid, total)

    await query.edit_message_text(
        f"✅ *{name}, вы в игре!*\n\n"
        f"Вы подтверждены как участник розыгрыша *Vatech Night*.\n\n"
        f"🔢 Ваш номер: *{pid}*\n"
        f"_Всего участников: {total}_\n\n"
        f"Следите за сообщениями — если вы выиграете, мы напишем сюда 🌙",
        parse_mode="Markdown",
    )

async def callback_confirm_night(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    name = query.from_user.first_name or "Участник"
    await query.edit_message_reply_markup(reply_markup=None)
    await query.message.reply_text(
        f"🎉 *Отлично, {name}!*\n\n"
        f"Ваше участие в Vatech Night подтверждено. Ждём вас! ✨",
        parse_mode="Markdown",
    )
    # Notify admins
    user = query.from_user
    note = f"✅ Победитель подтвердил участие: {user.full_name} (@{user.username or '—'}, id={user.id})"
    for aid in ADMIN_IDS:
        try:
            await query.get_bot().send_message(chat_id=aid, text=note)
        except Exception:
            pass
    log.info("night_confirm: user_id=%s name=%s", user.id, user.full_name)

async def _broadcast_text(text: str, parse_mode: str = "MarkdownV2"):
    rows = db_list_with_chat_id()
    ok = 0
    for r in rows:
        cid = r[4]
        if not cid:
            continue
        try:
            await _bot_app.bot.send_message(chat_id=cid, text=text, parse_mode=parse_mode)
            ok += 1
        except Exception as e:
            log.warning("broadcast skip chat_id=%s: %s", cid, e)
    return ok

@admin_only
async def cmd_announce(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    msg = (
        "🌙 *Vatech Night 28 мая \\(4 билета\\) — доступ ограничен*\n\n"
        "Совсем скоро мы разыграем билеты на закрытое вечернее мероприятие в рамках выставки\\.\n\n"
        "Это не просто вечер — это музыка, профессиональный нетворкинг "
        "и возможность стать частью Vatech Family\\.\n\n"
        "Проверьте, что вы выполнили все условия участия\\. "
        "Количество мест строго ограничено\\."
    )
    sent = await _broadcast_text(msg, parse_mode="MarkdownV2")
    await update.message.reply_text(f"📢 Анонс отправлен: {sent} участников")

@admin_only
async def cmd_hour(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    msg = (
        "⏰ *1 час до Vatech Night*\n\n"
        "Финальный момент перед розыгрышем\\.\n\n"
        "Убедитесь, что вы: ✔ участвуете ✔ выполнили все условия ✔ подписаны на наш Telegram\\-канал\n\n"
        "Через час мы определим, кто получит приглашение в закрытый круг гостей вечера\\."
    )
    sent = await _broadcast_text(msg, parse_mode="MarkdownV2")
    await update.message.reply_text(f"⏰ Рассылка «1 час» отправлена: {sent} участников")

@admin_only
async def cmd_launch(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    msg = (
        "🎉 *Запускаем розыгрыш Vatech Night*\n\n"
        "Прямо сейчас рандомайзер определяет гостей закрытого вечера\\.\n\n"
        "Уже через несколько минут станет ясно, кто получит доступ к атмосфере Vatech Night: "
        "музыка, общение и профессиональное окружение\\."
    )
    sent = await _broadcast_text(msg, parse_mode="MarkdownV2")
    await update.message.reply_text(f"🎉 Рассылка «старт» отправлена: {sent} участников")

@admin_only
async def cmd_export(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    rows = db_list()
    if not rows:
        await update.message.reply_text("😕 Нет участников для экспорта")
        return

    buf = io.StringIO()
    buf.write("\ufeff")  # BOM for Excel UTF-8
    writer = csv.writer(buf)
    writer.writerow(["№", "Имя", "Телефон", "Клиника", "Дата регистрации"])
    for r in rows:
        writer.writerow(r)

    data = buf.getvalue().encode("utf-8")
    await update.message.reply_document(
        document=io.BytesIO(data),
        filename="vatech_participants.csv",
        caption=f"📊 Экспорт участников — {len(rows)} чел.",
    )
    log.info("export: %d participants sent to admin", len(rows))

@admin_only
async def cmd_count(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    n = db_count()
    await update.message.reply_text(f"📊 Зарегистрировано участников: *{n}*", parse_mode="Markdown")

@admin_only
async def cmd_list(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    rows = db_list()
    if not rows:
        await update.message.reply_text("Список пуст"); return
    lines = [
        f"{r[0]}. {r[1]} — {r[2]}" + (f" ({r[3]})" if r[3] else "")
        for r in rows
    ]
    text = "📋 *Участники розыгрыша:*\n\n" + "\n".join(lines)
    for i in range(0, len(text), 4000):
        await update.message.reply_text(text[i:i+4000], parse_mode="Markdown")

@admin_only
async def cmd_reset(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    n = db_count()
    db_reset()
    await update.message.reply_text(f"🗑 Список очищен. Было удалено {n} участников.")

# ── Entry point ───────────────────────────────────────────────────────────────

async def _main():
    global _bot_app, _bot_loop

    init_db()
    threading.Thread(target=run_api, daemon=True).start()

    app = Application.builder().token(BOT_TOKEN).build()
    _bot_app  = app
    _bot_loop = asyncio.get_event_loop()   # the loop asyncio.run() created

    app.add_handler(CommandHandler("start",    cmd_start))
    app.add_handler(CommandHandler("export",   cmd_export))
    app.add_handler(CommandHandler("count",    cmd_count))
    app.add_handler(CommandHandler("list",     cmd_list))
    app.add_handler(CommandHandler("reset",    cmd_reset))
    app.add_handler(CommandHandler("announce", cmd_announce))
    app.add_handler(CommandHandler("hour",     cmd_hour))
    app.add_handler(CommandHandler("launch",   cmd_launch))
    app.add_handler(CallbackQueryHandler(callback_claim,         pattern="^claim$"))
    app.add_handler(CallbackQueryHandler(callback_confirm_night, pattern="^confirm_night$"))

    log.info("Bot polling started")
    await app.initialize()
    await app.start()
    await app.updater.start_polling()
    log.info("Polling active — press Ctrl+C to stop")
    await asyncio.Event().wait()   # block until cancelled

if __name__ == "__main__":
    import asyncio
    try:
        asyncio.run(_main())
    except KeyboardInterrupt:
        log.info("Stopped")
