import os
from threading import Thread
from flask import Flask

_app = Flask(__name__)


@_app.route("/")
def _home():
    return "Bot en ligne !"


def keep_alive() -> None:
    port = int(os.getenv("PORT", "8080"))
    Thread(target=lambda: _app.run(host="0.0.0.0", port=port), daemon=True).start()
