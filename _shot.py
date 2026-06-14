from playwright.sync_api import sync_playwright
import pathlib
url = pathlib.Path("tier_preview.html").resolve().as_uri()
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width":820,"height":520}, device_scale_factor=2)
    pg.goto(url); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(700)
    pg.screenshot(path="tier_preview.png", full_page=True)
    b.close()
print("OK")
