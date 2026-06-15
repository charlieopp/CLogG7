# filter_engine.py
from fastapi import HTTPException, APIRouter
from pydantic import BaseModel
from typing import List, Optional, Literal
from datetime import datetime
import re
from file_manager import file_contents

filter_router = APIRouter()

MONTHS = {
    'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
    'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
}

# --- Legacy flat AND-list models (kept for backward compatibility) ---

class FilterParameters(BaseModel):
    text: Optional[str] = None
    caseSensitive: Optional[bool] = False
    wholeWord: Optional[bool] = False
    pattern: Optional[str] = None
    flags: Optional[str] = ""
    timePattern: Optional[str] = None
    operator: Optional[str] = None
    value: Optional[str] = None
    endValue: Optional[str] = None

class Filter(BaseModel):
    id: str
    type: Literal['text', 'regex', 'time']
    operation: Literal['include', 'exclude']
    enabled: bool
    parameters: FilterParameters

# --- New expression-based model (mirrors filter_pills expression items) ---

class ExpressionItem(BaseModel):
    type: Literal['text', 'regex', 'time', 'operator']
    # text / regex
    text: Optional[str] = None
    pattern: Optional[str] = None
    flags: Optional[str] = ""
    caseSensitive: Optional[bool] = False
    wholeWord: Optional[bool] = False
    # text / regex / time
    isInclude: Optional[bool] = True
    # time
    fullTimeStr: Optional[str] = None
    # operator: 'AND' | 'OR' | 'NOT' | '(' | ')'
    operator: Optional[str] = None
    disabled: Optional[bool] = False

class FilterRequest(BaseModel):
    panelId: str
    filters: List[Filter] = []
    expression: Optional[List[ExpressionItem]] = None
    options: Optional[dict] = {}


# --- Per-item matching ---

def _match_text(item, line: str) -> bool:
    search = item.text or ''
    if not item.caseSensitive:
        line_cmp = line.lower()
        search_cmp = search.lower()
    else:
        line_cmp = line
        search_cmp = search

    if item.wholeWord:
        match = any(word == search_cmp for word in line_cmp.split())
    else:
        match = search_cmp in line_cmp

    return match if item.isInclude != False else not match


def _match_regex(item, line: str) -> bool:
    flags = 0
    if item.flags:
        if 'i' in item.flags: flags |= re.IGNORECASE
        if 'm' in item.flags: flags |= re.MULTILINE
        if 's' in item.flags: flags |= re.DOTALL
    try:
        pattern = re.compile(item.pattern, flags)
    except re.error:
        raise HTTPException(status_code=400, detail="PATTERN_COMPILATION_ERROR")

    match = bool(pattern.search(line))
    return match if item.isInclude != False else not match


# "Feb  9 2025 10:30:45.123" (day may be space-padded, millis optional)
_TARGET_TIME_RE = re.compile(
    r'^(\w{3})\s+(\d{1,2})\s+(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$'
)

# Log line timestamps, e.g. "2025-06-14T10:30:45.123" / "2025-06-14 10:30:45"
_LINE_ISO_RE = re.compile(
    r'^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:[.,](\d+))?'
)
# Syslog-style, e.g. "Jun 14 10:30:45" (no year)
_LINE_SYSLOG_RE = re.compile(
    r'^(\w{3})\s+(\d{1,2})\s+(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?'
)


def _parse_target_time(full_time_str: str) -> Optional[datetime]:
    if not full_time_str:
        return None
    m = _TARGET_TIME_RE.match(' '.join(full_time_str.split()))
    if not m:
        return None
    month_str, day, year, hour, minute, second, millis = m.groups()
    month = MONTHS.get(month_str)
    if not month:
        return None
    micros = int((millis or '0').ljust(3, '0')) * 1000
    try:
        return datetime(int(year), month, int(day), int(hour), int(minute), int(second), micros)
    except ValueError:
        return None


def _extract_line_time(line: str, ref_year: int) -> Optional[datetime]:
    m = _LINE_ISO_RE.match(line)
    if m:
        year, month, day, hour, minute, second, frac = m.groups()
        micros = int((frac or '0')[:6].ljust(6, '0')) if frac else 0
        try:
            return datetime(int(year), int(month), int(day), int(hour), int(minute), int(second), micros)
        except ValueError:
            return None

    m = _LINE_SYSLOG_RE.match(line)
    if m:
        month_str, day, hour, minute, second, millis = m.groups()
        month = MONTHS.get(month_str)
        if not month:
            return None
        micros = int((millis or '0').ljust(3, '0')) * 1000 if millis else 0
        try:
            return datetime(ref_year, month, int(day), int(hour), int(minute), int(second), micros)
        except ValueError:
            return None

    return None


def _match_time(item, line: str) -> bool:
    target = _parse_target_time(item.fullTimeStr or '')
    if target is None:
        return False

    line_time = _extract_line_time(line, target.year)
    if line_time is None:
        return False

    if item.isInclude != False:
        return line_time >= target
    else:
        return line_time <= target


# --- Boolean expression evaluation (AND / OR / NOT / parentheses) ---

_PRECEDENCE = {'NOT': 3, 'AND': 2, 'OR': 1}


def _to_postfix(items: List[ExpressionItem]) -> List:
    """Convert the ordered expression items to postfix (RPN), using
    shunting-yard. Operand items are referenced by their index into
    `items`; operator tokens are 'AND' / 'OR' / 'NOT'. Disabled items
    are skipped entirely."""
    output = []
    opstack = []

    for idx, item in enumerate(items):
        if item.disabled:
            continue

        if item.type != 'operator':
            output.append(idx)
            continue

        op = item.operator
        if op == '(':
            opstack.append('(')
        elif op == ')':
            while opstack and opstack[-1] != '(':
                output.append(opstack.pop())
            if opstack:
                opstack.pop()
        elif op in _PRECEDENCE:
            while opstack and opstack[-1] in _PRECEDENCE and (
                _PRECEDENCE[opstack[-1]] > _PRECEDENCE[op] or
                (_PRECEDENCE[opstack[-1]] == _PRECEDENCE[op] and op != 'NOT')
            ):
                output.append(opstack.pop())
            opstack.append(op)
        # unknown operators are ignored

    while opstack:
        top = opstack.pop()
        if top in _PRECEDENCE:
            output.append(top)

    return output


def _evaluate_postfix(postfix: List, operand_values: dict) -> bool:
    stack = []
    for token in postfix:
        if isinstance(token, int):
            stack.append(operand_values.get(token, True))
        elif token == 'NOT':
            a = stack.pop() if stack else True
            stack.append(not a)
        elif token in ('AND', 'OR'):
            default = True if token == 'AND' else False
            b = stack.pop() if stack else default
            a = stack.pop() if stack else default
            stack.append((a and b) if token == 'AND' else (a or b))

    return stack.pop() if stack else True


def _match_item(item, line: str) -> bool:
    if item.type == 'text':
        return _match_text(item, line)
    elif item.type == 'regex':
        return _match_regex(item, line)
    elif item.type == 'time':
        return _match_time(item, line)
    return True


@filter_router.post("/{file_id}/filter")
async def apply_filters(file_id: str, req: FilterRequest):
    if file_id not in file_contents:
        raise HTTPException(status_code=404, detail="FILE_NOT_FOUND")

    lines = file_contents[file_id]
    result = []
    maxResults = req.options.get("maxResults", 10000)

    if req.expression:
        postfix = _to_postfix(req.expression)
        operands = [
            (idx, item) for idx, item in enumerate(req.expression)
            if item.type != 'operator' and not item.disabled
        ]

        for line in lines:
            operand_values = {idx: _match_item(item, line) for idx, item in operands}

            if _evaluate_postfix(postfix, operand_values):
                result.append(line)
            if len(result) >= maxResults:
                break

    else:
        # Legacy flat AND-only list
        for line in lines:
            include = True
            for f in req.filters:
                if not f.enabled:
                    continue

                match = False
                if f.type == 'text':
                    search = f.parameters.text
                    if not f.parameters.caseSensitive:
                        line_cmp = line.lower()
                        search = search.lower()
                    else:
                        line_cmp = line
                    match = search in line_cmp
                    if f.parameters.wholeWord:
                        match = any(word == search for word in line.split())

                elif f.type == 'regex':
                    flags = 0
                    if 'i' in (f.parameters.flags or ''): flags |= re.IGNORECASE
                    try:
                        pattern = re.compile(f.parameters.pattern, flags)
                        match = bool(pattern.search(line))
                    except re.error:
                        raise HTTPException(status_code=400, detail="PATTERN_COMPILATION_ERROR")

                if (f.operation == 'include' and not match) or (f.operation == 'exclude' and match):
                    include = False
                    break

            if include:
                result.append(line)
            if len(result) >= maxResults:
                break

    return {
        "success": True,
        "fileId": file_id,
        "content": {
            "lines": result,
            "range": {"start": 1, "end": len(result)},
            "totalLines": len(lines),
            "hasMore": len(result) < len(lines)
        }
    }
