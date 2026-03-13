"""
Vatech Raffle Bot
─────────────────
HTTP API  POST /pending   — web form registers a participant (returns token)
          GET  /health    — participant count
Telegram  /start <token>  — welcome screen + button to claim number
          /draw           — pick random winner (admin only)
          /count          — how many participants
          /list           — full list
          /reset          — clear all participants
"""

import os, sqlite3, random, json, threading, logging, secrets
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
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                name         TEXT NOT NULL,
                phone        TEXT NOT NULL,
                clinic       TEXT DEFAULT '',
                registered_at TEXT DEFAULT (datetime('now','localtime'))
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS pending (
                token      TEXT PRIMARY KEY,
                name       TEXT NOT NULL,
                phone      TEXT NOT NULL,
                clinic     TEXT DEFAULT '',
                created_at TEXT DEFAULT (datetime('now','localtime'))
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
    """Return (name, phone, clinic) for a pending token, or None."""
    with sqlite3.connect(DB_PATH) as c:
        return c.execute(
            "SELECT name,phone,clinic FROM pending WHERE token=?", (token,)
        ).fetchone()

def db_confirm(token: str):
    """Move pending → participants. Returns (id, name, total) or None if token not found."""
    with sqlite3.connect(DB_PATH) as c:
        row = c.execute(
            "SELECT name,phone,clinic FROM pending WHERE token=?", (token,)
        ).fetchone()
        if not row:
            return None
        c.execute("DELETE FROM pending WHERE token=?", (token,))
        c.execute(
            "INSERT INTO participants (name,phone,clinic) VALUES (?,?,?)",
            row
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
            "SELECT id,name,phone,clinic FROM participants ORDER BY id"
        ).fetchall()

def db_draw():
    rows = db_list()
    return random.choice(rows) if rows else None

def db_reset():
    with sqlite3.connect(DB_PATH) as c:
        c.execute("DELETE FROM participants")

# ── HTTP API ──────────────────────────────────────────────────────────────────

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_): pass

    def _send(self, code: int, body: dict):
        data = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            self._send(200, {"ok": True, "participants": db_count()})
        else:
            self._send(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/pending":
            self._send(404, {"error": "not found"}); return
        try:
            length = int(self.headers.get("Content-Length", 0))
            body   = json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            self._send(400, {"error": "invalid json"}); return

        name   = str(body.get("firstName", "")).strip()
        phone  = str(body.get("phone",     "")).strip()
        clinic = str(body.get("clinic",    "")).strip()

        if not name or not phone:
            self._send(400, {"error": "name and phone required"}); return

        token = db_add_pending(name, phone, clinic)
        log.info("pending: %s %s → token %s", name, phone, token)
        self._send(200, {"ok": True, "token": token})


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
            # Token already used or invalid
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
            f"Вы зарегистрированы на мероприятии *Vatech*.\n\n"
            f"Нажмите кнопку ниже, чтобы получить свой номер участника в розыгрыше призов 🎁",
            parse_mode="Markdown",
            reply_markup=keyboard,
        )
    else:
        # No token — info screen
        await update.message.reply_text(
            "🎟 *Vatech — Розыгрыш призов*\n\n"
            "Для участия заполните анкету на стенде Vatech и перейдите по ссылке из формы.\n\n"
            "Розыгрыш состоится *28 мая в 17:00*. Удачи! 🍀",
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

    result = db_confirm(token)
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
        f"🎉 *Поздравляем, {name}!*\n\n"
        f"Вы стали участником розыгрыша призов Vatech.\n\n"
        f"🔢 Ваш номер участника: *{pid}*\n\n"
        f"_Всего зарегистрировано: {total}_\n\n"
        f"🕔 Розыгрыш — 28 мая в 17:00. Удачи! 🍀",
        parse_mode="Markdown",
    )

@admin_only
async def cmd_draw(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    winner = db_draw()
    if not winner:
        await update.message.reply_text("😕 Нет зарегистрированных участников")
        return
    n = db_count()
    clinic_line = f"🏥 {winner[3]}\n" if winner[3] else ""
    await update.message.reply_text(
        f"🎉 *ПОБЕДИТЕЛЬ РОЗЫГРЫША!* 🎉\n\n"
        f"👤 {winner[1]}\n"
        f"📞 {winner[2]}\n"
        f"🔢 Номер участника: *{winner[0]}*\n"
        f"{clinic_line}\n"
        f"_Выбран из {n} участников_",
        parse_mode="Markdown"
    )

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

if __name__ == "__main__":
    init_db()
    threading.Thread(target=run_api, daemon=True).start()

    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("draw",  cmd_draw))
    app.add_handler(CommandHandler("count", cmd_count))
    app.add_handler(CommandHandler("list",  cmd_list))
    app.add_handler(CommandHandler("reset", cmd_reset))
    app.add_handler(CallbackQueryHandler(callback_claim, pattern="^claim$"))

    log.info("Bot polling started")
    app.run_polling()
