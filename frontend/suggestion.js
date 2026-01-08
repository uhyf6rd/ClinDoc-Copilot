function renderSuggestionsForField(fid, suggestions) {
    const badge = document.getElementById(`sug_${fid}`);
    const tooltip = document.getElementById(`tip_${fid}`);

    if (!badge || !tooltip) return;

    if (!suggestions || suggestions.length === 0) {
        badge.classList.add('hidden');
        return;
    }


    badge.classList.remove('hidden');

    let suggestionList = suggestions.filter(sug => {
        if (!sug) return false;
        const clean = sug.trim().replace(/^['"]+|['"]+$/g, '');

        const rejectPattern = /空字符串|没有相关信息|无相关信息|无法提取|无法提供|暂无相关|抱歉.*无法|根据对话总结|暂无总结/i;
        return clean.length > 0 && !rejectPattern.test(clean);
    });

    const render = () => {
        tooltip.innerHTML = "";
        if (suggestionList.length === 0) {
            badge.classList.add('hidden');
            return;
        }

        const area = document.getElementById(fid);

        suggestionList.forEach((sug, idx) => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';

            const cleanSug = sug.replace(/^\d+[.、\s]*/, '').trim();
            item.innerText = cleanSug;

            item.onclick = (e) => {
                e.stopPropagation(); 

                const area = document.getElementById(fid);
                const originalSelectionStart = area.selectionStart;
                let currentVal = area.value;

                let beforeLines = [];
                let afterLines = [];

                if (currentVal.trim() === "") {
                    beforeLines = [];
                    afterLines = [];
                } else {
                    let charCount = 0;
                    const lines = currentVal.split('\n');
                    let cursorLineIdx = lines.length - 1; 

                    for (let i = 0; i < lines.length; i++) {

                        charCount += lines[i].length + 1;
                        if (charCount > originalSelectionStart) {
                            cursorLineIdx = i;
                            break;
                        }
                    }

                    beforeLines = lines.slice(0, cursorLineIdx + 1);
                    afterLines = lines.slice(cursorLineIdx + 1);
                }

                const allLines = [...beforeLines, cleanSug, ...afterLines];

                let counter = 1;
                const renumberedLines = allLines.map(line => {
                    const trimmed = line.trim();
                    if (!trimmed) return "";

                    const content = trimmed.replace(/^\d+[.、\s]*/, '').trim();
                    if (content.length > 0) {
                        return `${counter++}. ${content}`;
                    }
                    return line;
                });

                area.value = renumberedLines.join('\n');
                area.dispatchEvent(new Event('input'));

                suggestionList.splice(idx, 1);
                render();
                const insertedLineIdx = beforeLines.length;
                let newCursorPos = 0;
                for (let i = 0; i <= insertedLineIdx; i++) {
                    if (i < renumberedLines.length) {
                        newCursorPos += renumberedLines[i].length + 1;
                    }
                }

                if (newCursorPos > area.value.length) newCursorPos = area.value.length;

                area.focus();

                const finalPos = Math.max(0, newCursorPos - 1);
                area.setSelectionRange(finalPos, finalPos);
            };

            tooltip.appendChild(item);
        });
    };

    render();
}

function getNextNumber(text) {
    let nextNum = 1;
    if (!text) return 1;

    const lines = text.split('\n');
    lines.forEach(line => {
        const match = line.match(/^(\d+)[.、]/);
        if (match) {
            const num = parseInt(match[1]);
            if (num >= nextNum) nextNum = num + 1;
        }
    });
    return nextNum;
}
