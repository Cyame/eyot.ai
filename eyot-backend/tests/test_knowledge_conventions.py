from app.core.knowledge import SYSTEM_SEEDS


def test_system_knowledge_seeds_are_standing_conventions() -> None:
    keys = {row["key"] for row in SYSTEM_SEEDS}
    assert keys == {"eyot.collab.passage", "eyot.hub.shared_work"}
    for row in SYSTEM_SEEDS:
        assert "公约" in row["body"]
        assert "不会" in row["body"]
