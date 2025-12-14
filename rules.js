// Правила для извлечения сущностей из текста
const ENTITY_RULES = {
    AGENT: [
        'customer', 'client', 'user', 'member',
        'support agent', 'agent', 'representative', 'assistant',
        'finance department', 'finance team', 'accounting',
        'system', 'software', 'application', 'platform',
        'manager', 'supervisor', 'director',
        'employee', 'staff', 'worker', 'team',
        'admin', 'administrator',
        'department', 'division', 'unit'
    ],
    
    TASK: [
        'submit', 'send', 'provide', 'give',
        'review', 'check', 'examine', 'verify',
        'approve', 'authorize', 'confirm', 'validate',
        'process', 'handle', 'manage', 'execute',
        'receive', 'get', 'obtain', 'collect',
        'inform', 'notify', 'tell', 'update',
        'create', 'generate', 'produce',
        'update', 'modify', 'change', 'edit',
        'delete', 'remove', 'cancel',
        'pay', 'charge', 'invoice',
        'refund', 'return', 'reimburse'
    ],
    
    CONDITION: [
        'if', 'when', 'whenever', 'in case',
        'else', 'otherwise',
        'provided that', 'assuming', 'given that',
        'unless', 'except'
    ]
};

// Синонимы и варианты написания
const WORD_VARIANTS = {
    'submits': 'submit',
    'submitted': 'submit',
    'submitting': 'submit',
    'reviews': 'review',
    'reviewed': 'review',
    'reviewing': 'review',
    'approves': 'approve',
    'approved': 'approve',
    'approving': 'approve',
    'processes': 'process',
    'processed': 'process',
    'processing': 'process',
    'receives': 'receive',
    'received': 'receive',
    'receiving': 'receive',
    'informs': 'inform',
    'informed': 'inform',
    'informing': 'inform',
    'customers': 'customer',
    'agents': 'agent',
    'departments': 'department',
    'systems': 'system',
    'managers': 'manager',
    'employees': 'employee'
};

// Сложные шаблоны для поиска
const PATTERNS = {
    AGENT_PATTERNS: [
        /the\s+([a-z]+\s+)*(customer|client|user)/gi,
        /([a-z]+\s+)*(agent|representative|assistant)/gi,
        /([a-z]+\s+)*(department|team|division)/gi,
        /([a-z]+\s+)*(system|software|application)/gi
    ],
    
    TASK_PATTERNS: [
        /(submit|send|provide)\s+a\s+([a-z]+\s+)*request/gi,
        /(review|check|examine)\s+the\s+([a-z]+\s+)*/gi,
        /(approve|authorize|confirm)\s+the\s+([a-z]+\s+)*/gi,
        /(process|handle|execute)\s+the\s+([a-z]+\s+)*/gi,
        /(receive|get|obtain)\s+a\s+([a-z]+\s+)*/gi,
        /(inform|notify|tell)\s+the\s+([a-z]+\s+)*/gi
    ],
    
    CONDITION_PATTERNS: [
        /if\s+the\s+([a-z]+\s+)*/gi,
        /when\s+the\s+([a-z]+\s+)*/gi,
        /provided\s+that\s+the\s+([a-z]+\s+)*/gi,
        /else\s+(the\s+)*([a-z]+\s+)*/gi
    ]
};

// Цвета для типов сущностей
const ENTITY_COLORS = {
    AGENT: '#7FDBFF',
    TASK: '#FFDC00',
    CONDITION: '#FF851B',
    O: '#DDDDDD'
};

// Функция для нормализации слова
function normalizeWord(word) {
    word = word.toLowerCase().trim();
    
    // Убираем пунктуацию в конце слова
    word = word.replace(/[.,;!?]$/, '');
    
    // Проверяем варианты написания
    if (WORD_VARIANTS[word]) {
        return WORD_VARIANTS[word];
    }
    
    return word;
}

// Функция для проверки, является ли слово сущностью
function getEntityType(word) {
    const normalized = normalizeWord(word);
    
    // Проверяем правила для каждого типа
    for (const [type, words] of Object.entries(ENTITY_RULES)) {
        if (words.includes(normalized)) {
            return type;
        }
    }
    
    return 'O'; // Other
}

// Функция для извлечения сложных фраз
function extractComplexPhrases(text, patterns, entityType) {
    const entities = [];
    
    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            entities.push({
                text: match[0].trim(),
                type: entityType,
                start: match.index,
                end: match.index + match[0].length
            });
        }
    }
    
    return entities;
}

// Основная функция извлечения сущностей
function extractEntities(text) {
    const entities = [];
    const words = text.split(/\s+/);
    
    // Извлекаем сложные фразы
    const complexEntities = [
        ...extractComplexPhrases(text, PATTERNS.AGENT_PATTERNS, 'AGENT'),
        ...extractComplexPhrases(text, PATTERNS.TASK_PATTERNS, 'TASK'),
        ...extractComplexPhrases(text, PATTERNS.CONDITION_PATTERNS, 'CONDITION')
    ];
    
    // Сортируем по позиции
    complexEntities.sort((a, b) => a.start - b.start);
    
    // Извлекаем отдельные слова
    let currentIndex = 0;
    
    for (const complex of complexEntities) {
        // Добавляем слова до сложной фразы
        while (currentIndex < complex.start) {
            const wordEnd = text.indexOf(' ', currentIndex);
            if (wordEnd === -1 || wordEnd > complex.start) break;
            
            const word = text.substring(currentIndex, wordEnd);
            if (word.trim()) {
                entities.push([word.trim(), getEntityType(word)]);
            }
            currentIndex = wordEnd + 1;
        }
        
        // Добавляем сложную фразу
        entities.push([complex.text, complex.type]);
        currentIndex = complex.end;
    }
    
    // Добавляем оставшиеся слова
    const remainingWords = text.substring(currentIndex).split(/\s+/);
    for (const word of remainingWords) {
        if (word.trim()) {
            entities.push([word.trim(), getEntityType(word)]);
        }
    }
    
    return entities;
}
