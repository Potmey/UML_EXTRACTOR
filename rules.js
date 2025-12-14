// Улучшенные правила для извлечения сущностей
const ENTITY_RULES = {
    AGENT: [
        // Основные агенты
        'customer', 'client', 'user',
        'support agent', 'agent', 'representative',
        'finance department', 'finance',
        'system', 'software', 'application',
        'manager', 'supervisor',
        'employee', 'staff',
        'admin', 'administrator',
        'department', 'team'
    ],
    
    TASK: [
        // Основные действия
        'submit', 'sends', 'provides',
        'review', 'checks', 'examines',
        'approve', 'authorizes', 'confirms',
        'process', 'handles', 'executes',
        'receive', 'gets', 'obtains',
        'inform', 'notifies', 'tells',
        'create', 'generates',
        'update', 'modifies',
        'delete', 'removes',
        'pay', 'charges',
        'refund', 'returns'
    ],
    
    CONDITION: [
        'if', 'when', 'whenever',
        'else', 'otherwise',
        'provided that', 'assuming'
    ]
};

// Словарь синонимов и форм слов
const WORD_FORMS = {
    // Глаголы
    'submits': 'submit',
    'submitted': 'submit',
    'submitting': 'submit',
    'sends': 'send',
    'sent': 'send',
    'sending': 'send',
    'reviews': 'review',
    'reviewed': 'review',
    'reviewing': 'review',
    'checks': 'check',
    'checked': 'check',
    'checking': 'check',
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
    
    // Существительные
    'customers': 'customer',
    'clients': 'client',
    'users': 'user',
    'agents': 'agent',
    'representatives': 'representative',
    'departments': 'department',
    'systems': 'system',
    'managers': 'manager',
    'employees': 'employee'
};

// Шаблоны для сложных фраз
const PHRASE_PATTERNS = [
    // Агенты
    { pattern: /\b(the\s+)?customer\b/gi, type: 'AGENT' },
    { pattern: /\b(the\s+)?support\s+agent\b/gi, type: 'AGENT' },
    { pattern: /\b(the\s+)?finance\s+(department|team)\b/gi, type: 'AGENT' },
    { pattern: /\b(the\s+)?system\b/gi, type: 'AGENT' },
    
    // Задачи с контекстом
    { pattern: /\bsubmits?\s+(a\s+)?(refund\s+)?request\b/gi, type: 'TASK' },
    { pattern: /\breviews?\s+the\s+request\b/gi, type: 'TASK' },
    { pattern: /\bapproves?\s+the\s+refund\b/gi, type: 'TASK' },
    { pattern: /\bprocesses?\s+the\s+payment\b/gi, type: 'TASK' },
    { pattern: /\breceives?\s+a\s+confirmation\s+email\b/gi, type: 'TASK' },
    { pattern: /\binforms?\s+the\s+customer\b/gi, type: 'TASK' },
    
    // Условия
    { pattern: /\bif\s+the\s+request\s+is\s+valid\b/gi, type: 'CONDITION' },
    { pattern: /\belse\b/gi, type: 'CONDITION' },
    { pattern: /\botherwise\b/gi, type: 'CONDITION' }
];

// Цвета для типов сущностей
const ENTITY_COLORS = {
    AGENT: '#7FDBFF',    // Голубой
    TASK: '#FFDC00',     // Желтый
    CONDITION: '#FF851B', // Оранжевый
    O: '#DDDDDD'         // Серый
};

// Нормализация слова
function normalizeWord(word) {
    if (!word || typeof word !== 'string') return '';
    
    let normalized = word.toLowerCase().trim();
    
    // Убираем пунктуацию
    normalized = normalized.replace(/[.,;!?':"]+$/g, '');
    
    // Проверяем варианты написания
    if (WORD_FORMS[normalized]) {
        return WORD_FORMS[normalized];
    }
    
    return normalized;
}

// Основная функция извлечения сущностей
function extractEntities(text) {
    if (!text || typeof text !== 'string') {
        return [];
    }
    
    const entities = [];
    const words = text.match(/\b[\w']+(?:\s+[\w']+)*\b/g) || [];
    
    // Сначала обрабатываем сложные фразы
    const processedIndices = new Set();
    
    for (const pattern of PHRASE_PATTERNS) {
        const regex = new RegExp(pattern.pattern.source, 'gi');
        let match;
        
        while ((match = regex.exec(text)) !== null) {
            const phrase = match[0];
            const start = match.index;
            const end = start + phrase.length;
            
            // Проверяем, не обработали ли мы уже эту часть текста
            let alreadyProcessed = false;
            for (let i = start; i < end; i++) {
                if (processedIndices.has(i)) {
                    alreadyProcessed = true;
                    break;
                }
            }
            
            if (!alreadyProcessed) {
                // Добавляем фразу как сущность
                entities.push([phrase, pattern.type]);
                
                // Помечаем индексы как обработанные
                for (let i = start; i < end; i++) {
                    processedIndices.add(i);
                }
            }
        }
    }
    
    // Затем обрабатываем отдельные слова
    let currentIndex = 0;
    const textLower = text.toLowerCase();
    
    while (currentIndex < text.length) {
        // Пропускаем уже обработанные символы
        if (processedIndices.has(currentIndex)) {
            currentIndex++;
            continue;
        }
        
        // Ищем следующее слово
        const wordMatch = textLower.substring(currentIndex).match(/\b\w+\b/);
        if (!wordMatch) break;
        
        const wordStart = currentIndex + wordMatch.index;
        const wordEnd = wordStart + wordMatch[0].length;
        const word = text.substring(wordStart, wordEnd);
        
        // Проверяем, не входит ли слово в уже обработанную фразу
        let inProcessedPhrase = false;
        for (let i = wordStart; i < wordEnd; i++) {
            if (processedIndices.has(i)) {
                inProcessedPhrase = true;
                break;
            }
        }
        
        if (!inProcessedPhrase) {
            const normalized = normalizeWord(word);
            let type = 'O';
            
            // Проверяем правила
            if (ENTITY_RULES.AGENT.includes(normalized)) {
                type = 'AGENT';
            } else if (ENTITY_RULES.TASK.includes(normalized)) {
                type = 'TASK';
            } else if (ENTITY_RULES.CONDITION.includes(normalized)) {
                type = 'CONDITION';
            }
            
            entities.push([word, type]);
        }
        
        currentIndex = wordEnd;
    }
    
    // Сортируем по позиции в тексте
    entities.sort((a, b) => {
        const aIndex = text.indexOf(a[0]);
        const bIndex = text.indexOf(b[0]);
        return aIndex - bIndex;
    });
    
    return entities;
}

// Функция для группировки последовательных сущностей одного типа
function groupEntities(entities) {
    if (!entities || entities.length === 0) return [];
    
    const grouped = [];
    let currentGroup = [];
    let currentType = null;
    
    for (const [word, type] of entities) {
        if (type === currentType && type !== 'O') {
            // Продолжаем текущую группу
            currentGroup.push(word);
        } else {
            // Сохраняем предыдущую группу
            if (currentGroup.length > 0) {
                grouped.push([currentGroup.join(' '), currentType]);
            }
            
            // Начинаем новую группу
            currentGroup = [word];
            currentType = (type === 'O' ? null : type);
        }
    }
    
    // Добавляем последнюю группу
    if (currentGroup.length > 0) {
        grouped.push([currentGroup.join(' '), currentType]);
    }
    
    // Добавляем отдельные слова типа O
    const result = [];
    for (const [text, type] of grouped) {
        if (type === null) {
            // Разбиваем на отдельные слова для типа O
            text.split(' ').forEach(word => {
                if (word.trim()) {
                    result.push([word.trim(), 'O']);
                }
            });
        } else {
            result.push([text, type]);
        }
    }
    
    return result;
}
