class BPMNExtractor {
    // ... остальной код остается таким же ...
    
    // Улучшенная функция построения структуры
    buildStructure(entities) {
        const structure = [];
        let currentPhrase = [];
        let currentType = null;
        
        // Группируем сущности перед обработкой
        const groupedEntities = groupEntities(entities);
        
        for (const [word, label] of groupedEntities) {
            const wordLower = word.toLowerCase();
            
            // Обрабатываем специальные случаи
            if (wordLower === 'else' || wordLower === 'otherwise') {
                // Сохраняем текущую фразу
                if (currentPhrase.length > 0 && currentType) {
                    structure.push({
                        word: currentPhrase.join(' ').trim(),
                        type: currentType
                    });
                    currentPhrase = [];
                }
                
                // Добавляем условие
                structure.push({ word: word, type: 'CONDITION' });
                continue;
            }
            
            // Если тип изменился, сохраняем предыдущую фразу
            if (currentType !== null && label !== currentType && label !== 'O') {
                if (currentPhrase.length > 0) {
                    structure.push({
                        word: currentPhrase.join(' ').trim(),
                        type: currentType
                    });
                }
                currentPhrase = [];
            }
            
            // Добавляем слово в текущую фразу
            if (label !== 'O') {
                currentPhrase.push(word);
                currentType = label;
            } else if (currentType !== null) {
                // Добавляем слова типа O только если они внутри фразы
                const lastWord = currentPhrase[currentPhrase.length - 1];
                if (lastWord && !lastWord.match(/[.,;!?]$/)) {
                    currentPhrase.push(word);
                }
            }
        }
        
        // Добавляем последнюю фразу
        if (currentPhrase.length > 0 && currentType) {
            structure.push({
                word: currentPhrase.join(' ').trim(),
                type: currentType
            });
        }
        
        // Очищаем структуру от мусора
        return structure.filter(item => {
            if (!item.word || !item.type) return false;
            
            // Удаляем лишние пунктуации
            item.word = item.word
                .replace(/^[.,;!?\s]+|[.,;!?\s]+$/g, '')
                .trim();
            
            return item.word.length > 0;
        });
    }
    
    // Улучшенная генерация PlantUML
    generatePlantUML() {
        let plantuml = "@startuml\n";
        let currentLane = null;
        let insideIf = false;
        let ifStarted = false;
        
        for (const item of this.structure) {
            const word = item.word;
            const type = item.type;
            
            switch (type) {
                case 'AGENT':
                    // Очищаем текст агента
                    let agentName = word
                        .replace(/^the\s+/i, '')
                        .replace(/\s+(department|agent|system)$/i, '')
                        .trim();
                    
                    if (agentName && agentName !== currentLane) {
                        plantuml += `|${agentName}|\n`;
                        currentLane = agentName;
                    }
                    break;
                    
                case 'TASK':
                    // Очищаем текст задачи
                    let taskText = word
                        .replace(/^(submits|reviews|approves|processes|receives|informs)\s+/i, '')
                        .trim();
                    
                    if (taskText) {
                        plantuml += `:${taskText};\n`;
                    }
                    break;
                    
                case 'CONDITION':
                    const conditionLower = word.toLowerCase();
                    if (conditionLower === 'else' || conditionLower === 'otherwise') {
                        plantuml += "else (no)\n";
                    } else {
                        // Извлекаем условие из текста
                        let conditionText = word
                            .replace(/^if\s+/i, '')
                            .replace(/\s+is\s+valid$/i, '')
                            .trim();
                        
                        if (conditionText) {
                            plantuml += `if (${conditionText}?) then (yes)\n`;
                            insideIf = true;
                            ifStarted = true;
                        }
                    }
                    break;
            }
        }
        
        // Закрываем if если он был открыт
        if (ifStarted) {
            plantuml += "endif\n";
        }
        
        plantuml += "stop\n@enduml";
        return plantuml;
    }
    
    // Улучшенная визуализация сущностей
    visualizeEntities(entities) {
        const grouped = groupEntities(entities);
        let html = '<div class="entities-container">';
        
        grouped.forEach(([word, type]) => {
            const color = this.ENTITY_COLORS[type] || this.ENTITY_COLORS.O;
            const title = type === 'O' ? '' : `title="${type}"`;
            html += `<span class="entity-tag" style="background:${color}" ${title}>${word}</span>`;
        });
        
        html += '</div>';
        return html;
    }
    
    // ... остальной код остается таким же ...
}
