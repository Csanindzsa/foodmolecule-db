from pathlib import Path
import xml.etree.ElementTree as ET


PROJECT_ROOT = Path(__file__).resolve().parents[3]
WEB_ROOT = PROJECT_ROOT / "web"


def test_static_sitemap_covers_public_react_routes():
    sitemap = ET.parse(WEB_ROOT / "public" / "sitemap.xml")
    namespace = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    urls = {
        loc.text
        for loc in sitemap.findall(".//sm:loc", namespace)
    }

    assert urls == {
        "https://nutrii.fit/",
        "https://nutrii.fit/search",
        "https://nutrii.fit/compare",
        "https://nutrii.fit/ban-list",
    }


def test_robots_txt_points_crawlers_to_sitemap():
    robots = (WEB_ROOT / "public" / "robots.txt").read_text(encoding="utf-8")

    assert "User-agent: *" in robots
    assert "Allow: /" in robots
    assert "Sitemap: https://nutrii.fit/sitemap.xml" in robots
