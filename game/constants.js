(function () {
    const CHAR_SETS = {
        lower: 'abcdefghijklmnopqrstuvwxyz'.split(''),
        upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
        digits: '0123456789'.split(''),
        symbols: [
            '!', '@', '#', '$', '%', '^', '&', '*', '(', ')',
            '-', '_', '=', '+', '[', ']', '{', '}', ';', ':',
            "'", '"', ',', '.', '/', '?', '\\', '|', '<', '>', '~', '`'
        ]
    };

    /**
     * B2 字元難度加乘：小寫 1.0x / 數字+大寫 1.5x / 符號 2.0x
     */
    const DIFFICULTY_MULTIPLIER = {
        easy:   1.0,
        medium: 1.5,
        hard:   2.0
    };

    function getCharDifficulty(char) {
        if (CHAR_SETS.lower.includes(char))  return 'easy';
        if (CHAR_SETS.digits.includes(char)) return 'medium';
        if (CHAR_SETS.upper.includes(char))  return 'medium';
        return 'hard';
    }

    const ALL_CHARS = [
        ...CHAR_SETS.lower,
        ...CHAR_SETS.upper,
        ...CHAR_SETS.digits,
        ...CHAR_SETS.symbols
    ];

    // 難辨符號長輩與無障礙中文易辨標籤對照表
    const SYMBOL_ANNOTATIONS = {
        '.': '句點', ',': '逗號', ':': '冒號', ';': '分號',
        "'": '單引', '"': '雙引', '`': '反引', '~': '波浪',
        '!': '驚嘆', '?': '問號', '-': '減號', '_': '底線',
        '=': '等於', '+': '加號', '[': '中括', ']': '中括',
        '{': '大括', '}': '大括', '/': '斜線', '\\': '反斜',
        '|': '豎線', '@': '老鼠', '#': '井字', '$': '金錢',
        '%': '百分', '^': '次方', '&': 'AND',  '*': '星號'
    };

    // AI 模型設定（不同級別的反應速度、準確率與思考頻率）
    const AI_MODELS = {
        rookie: {
            name: 'AI_ROOKIE_V1',
            label: '🟢 初級 (ROOKIE)',
            minDelay: 220,
            maxDelay: 320,
            accuracy: 0.88,
            scanInterval: 140,
            empCrowdThreshold: 6,
            empDangerZone: 110
        },
        veteran: {
            name: 'AI_CYBER_PRO',
            label: '🟡 老兵 (PRO)',
            minDelay: 90,
            maxDelay: 150,
            accuracy: 0.98,
            scanInterval: 70,
            empCrowdThreshold: 4,
            empDangerZone: 130
        },
        god: {
            name: 'AI_AGI_OVERLORD',
            label: '🔴 AGI (GOD)',
            minDelay: 30,
            maxDelay: 55,
            accuracy: 1.0,
            scanInterval: 35,
            empCrowdThreshold: 2,
            empDangerZone: 180
        }
    };

    // 終端機虛擬鍵盤佈局（對映全字元、符號與 Shift 組合鍵）
    const KEYBOARD_LAYOUT = [
        [
            { key: '`', shift: '~' }, { key: '1', shift: '!' }, { key: '2', shift: '@' },
            { key: '3', shift: '#' }, { key: '4', shift: '$' }, { key: '5', shift: '%' },
            { key: '6', shift: '^' }, { key: '7', shift: '&' }, { key: '8', shift: '*' },
            { key: '9', shift: '(' }, { key: '0', shift: ')' }, { key: '-', shift: '_' },
            { key: '=', shift: '+' }, { key: 'Backspace', label: 'DEL', width: 'wide' }
        ],
        [
            { key: 'Tab', label: 'TAB', width: 'wide' },
            { key: 'q', shift: 'Q' }, { key: 'w', shift: 'W' }, { key: 'e', shift: 'E' },
            { key: 'r', shift: 'R' }, { key: 't', shift: 'T' }, { key: 'y', shift: 'Y' },
            { key: 'u', shift: 'U' }, { key: 'i', shift: 'I' }, { key: 'o', shift: 'O' },
            { key: 'p', shift: 'P' }, { key: '[', shift: '{' }, { key: ']', shift: '}' },
            { key: '\\', shift: '|', width: 'wide' }
        ],
        [
            { key: 'CapsLock', label: 'CAPS', width: 'wider' },
            { key: 'a', shift: 'A' }, { key: 's', shift: 'S' }, { key: 'd', shift: 'D' },
            { key: 'f', shift: 'F' }, { key: 'g', shift: 'G' }, { key: 'h', shift: 'H' },
            { key: 'j', shift: 'J' }, { key: 'k', shift: 'K' }, { key: 'l', shift: 'L' },
            { key: ';', shift: ':' }, { key: "'", shift: '"' },
            { key: 'Enter', label: 'ENTER', width: 'wider' }
        ],
        [
            { key: 'ShiftLeft', label: 'SHIFT', width: 'widest', isShift: true },
            { key: 'z', shift: 'Z' }, { key: 'x', shift: 'X' }, { key: 'c', shift: 'C' },
            { key: 'v', shift: 'V' }, { key: 'b', shift: 'B' }, { key: 'n', shift: 'N' },
            { key: 'm', shift: 'M' }, { key: ',', shift: '<' }, { key: '.', shift: '>' },
            { key: '/', shift: '?' },
            { key: 'ShiftRight', label: 'SHIFT', width: 'widest', isShift: true }
        ],
        [
            { key: 'Control', label: 'CTRL', width: 'wide' },
            { key: 'Alt', label: 'OPT' },
            { key: 'Meta', label: 'CMD' },
            { key: ' ', label: '空白鍵 SPACE [AI 神經掃描]', width: 'space' },
            { key: 'Meta', label: 'CMD' },
            { key: 'Alt', label: 'OPT' },
            { key: 'ai-eye', label: '👁️ AI 視線', width: 'wide' }
        ]
    ];

    const exportsObj = {
        CHAR_SETS,
        DIFFICULTY_MULTIPLIER,
        getCharDifficulty,
        ALL_CHARS,
        SYMBOL_ANNOTATIONS,
        AI_MODELS,
        KEYBOARD_LAYOUT
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = exportsObj;
    }
    if (typeof window !== 'undefined') {
        window.TypingGameConstants = exportsObj;
    }
})();

