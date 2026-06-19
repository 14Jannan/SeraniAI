#!/usr/bin/env python
import os
import sys


def _ensure_local_venv_python() -> None:
    """Re-launch with .venv Python on Windows when available.

    This allows `python run.py` to work even if the global Python does not have
    service dependencies installed.
    """
    script_dir = os.path.dirname(os.path.abspath(__file__))
    venv_python = os.path.join(script_dir, ".venv", "Scripts", "python.exe")

    if not os.path.exists(venv_python):
        return

    current = os.path.normcase(os.path.abspath(sys.executable))
    target = os.path.normcase(os.path.abspath(venv_python))

    if current == target:
        return

    # Replace current process with the venv interpreter to avoid parent-process
    # KeyboardInterrupt tracebacks when stopping the server.
    os.execv(venv_python, [venv_python, *sys.argv])


_ensure_local_venv_python()

import uvicorn
from app.config import CHROMA_HOST, CHROMA_PORT

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=CHROMA_HOST,
        port=CHROMA_PORT,
        reload=False
    )
