#!/usr/bin/env python3
"""Verify a generated report PDF: page count, key content strings, size sanity.

Usage: verify_pdf.py <report.pdf> [expected_string ...]
"""
import sys
from pathlib import Path

from pypdf import PdfReader


def main() -> int:
    path = Path(sys.argv[1])
    expected = sys.argv[2:] or ["Executive summary", "Methodology"]

    size = path.stat().st_size
    assert size > 30_000, f"PDF suspiciously small: {size} bytes"
    assert path.read_bytes()[:5] == b"%PDF-", "not a PDF file"

    reader = PdfReader(path)
    pages = len(reader.pages)
    assert pages >= 4, f"expected >= 4 pages (cover, summary, value, appendix), got {pages}"

    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    missing = [s for s in expected if s not in text]
    assert not missing, f"strings missing from PDF text: {missing}"

    print(f"OK: {path.name} — {pages} pages, {size // 1024} KiB, all strings present")
    return 0


if __name__ == "__main__":
    sys.exit(main())
