import hashlib
import json
from typing import Dict, Iterable, List, Tuple


def calculate_entry_hash(entry: Dict[str, object], previous_hash: str) -> str:
    """Calculate SHA-256 hash for a ledger entry using canonical fields."""
    hash_payload = {
        "entry_id": entry["entry_id"],
        "timestamp": entry["timestamp"],
        "decision_type": entry["decision_type"],
        "decision": entry["decision"],
        "rationale": entry["rationale"],
        "approver": entry["approver"],
        "risk_grade": entry["risk_grade"],
        "previous_hash": previous_hash,
    }

    canonical = json.dumps(hash_payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def load_ledger_entries(ledger_file: str) -> Iterable[Dict[str, object]]:
    """Load ledger entries from docs/META_LEDGER.md.

    This is a placeholder. Replace with a real parser that yields entries
    in order with required fields.
    """
    raise NotImplementedError("Implement ledger parser for META_LEDGER.md")


def validate_ledger_integrity(ledger_file: str) -> Tuple[bool, str]:
    """Verify entire Merkle chain integrity for the ledger file."""
    entries: List[Dict[str, object]] = list(load_ledger_entries(ledger_file))

    previous_hash = "0" * 64
    for entry in entries:
        expected_hash = calculate_entry_hash(entry, previous_hash)

        if entry.get("entry_hash") != expected_hash:
            return False, f"Chain broken at entry {entry.get('entry_id')}"

        previous_hash = entry["entry_hash"]

    return True, "Chain integrity verified"
