from playwright.sync_api import sync_playwright
import pathlib
url = pathlib.Path("berry_preview.html").resolve().as_uri()
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width":1280,"height":900}, device_scale_factor=2)
    pg.goto(url)
    pg.wait_for_load_state("networkidle")
    pg.wait_for_timeout(600)  # laisser les Google Fonts se charger
    pg.screenshot(path="berry_preview.png", full_page=True)
    b.close()
print("OK")
