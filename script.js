class BPMNExtractor {
    constructor() {
        this.ENTITY_COLORS = ENTITY_COLORS;
        this.currentLane = null;
        this.insideIf = false;
        this.structure = [];
    }
    
    // Основная функция анализа
    analyzeText(text) {
        if (!text.trim()) {
            throw new Error('Please enter some text to analyze.');
        }
        
        // Извлекаем сущности
        const entities = extractEntities(text);
        
        // Строим структуру процесса
        this.structure = this.buildStructure(entities);
        
        // Генерируем результаты
        const results = {
            entities: entities,
            structure: this.structure,
            plantuml: this.generatePlantUML(),
            plantumlUrl: this.generatePlantUMLUrl(),
            interactionMatrix: this.buildInteractionMatrix(),
            entitiesHtml: this.visualizeEntities(entities),
            structureHtml: this.visualizeStructure()
        };
        
        return results;
    }
    
    // Построение структуры из сущностей
    buildStructure(entities) {
        const structure = [];
        let currentWord = '';
        let currentType = null;
        
        for (const [word, label] of entities) {
            const low = word.toLowerCase();
            
            // Обрабатываем условия
            if (low === 'else' || low === 'otherwise') {
                if (currentWord) {
                    structure.push({ word: currentWord.trim(), type: currentType });
                }
                structure.push({ word: low, type: 'CONDITION' });
                currentWord = '';
                currentType = null;
                continue;
            }
            
            // Проверяем базовый тип
            if (label === 'AGENT' || label === 'TASK' || label === 'CONDITION') {
                currentWord += word + ' ';
                currentType = label;
            } else {
                if (currentWord) {
                    structure.push({ word: currentWord.trim(), type: currentType });
                }
                currentWord = '';
                currentType = null;
            }
        }
        
        // Добавляем последний элемент
        if (currentWord) {
            structure.push({ word: currentWord.trim(), type: currentType });
        }
        
        return structure;
    }
    
    // Генерация PlantUML кода
    generatePlantUML() {
        let plantuml = "@startuml\n";
        this.currentLane = null;
        this.insideIf = false;
        
        for (const item of this.structure) {
            const word = item.word;
            const type = item.type;
            
            if (type === 'AGENT') {
                if (word !== this.currentLane) {
                    plantuml += `|${word}|\n`;
                    this.currentLane = word;
                }
            } else if (type === 'CONDITION') {
                if (word.toLowerCase() === 'else' || word.toLowerCase() === 'otherwise') {
                    plantuml += "else (no)\n";
                } else {
                    plantuml += `if (${word}?) then (yes)\n`;
                    this.insideIf = true;
                }
            } else if (type === 'TASK') {
                plantuml += `:${word};\n`;
            }
        }
        
        if (this.insideIf) {
            plantuml += "endif\n";
        }
        
        plantuml += "stop\n@enduml";
        return plantuml;
    }
    
    // Генерация URL для PlantUML
    generatePlantUMLUrl() {
        const plantuml = this.generatePlantUML();
        
        // Простая реализация кодирования для PlantUML
        try {
            // Используем упрощенное кодирование (в реальности нужен алгоритм как в Python)
            const encoded = this.simplePlantUMLEncode(plantuml);
            return `https://www.plantuml.com/plantuml/svg/${encoded}`;
        } catch (e) {
            console.warn('Failed to encode PlantUML:', e);
            // Возвращаем URL с сырым текстом (ограниченная длина)
            const encoded = encodeURIComponent(plantuml.substring(0, 1000));
            return `https://www.plantuml.com/plantuml/svg/~1${encoded}`;
        }
    }
    
    // Упрощенное кодирование PlantUML
    simplePlantUMLEncode(text) {
        // Используем base64 кодирование как fallback
        const base64 = btoa(unescape(encodeURIComponent(text)));
        return base64
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }
    
    // Визуализация сущностей с цветовой подсветкой
    visualizeEntities(entities) {
        let html = '<div class="entities-container">';
        
        entities.forEach(([word, type]) => {
            const color = this.ENTITY_COLORS[type] || this.ENTITY_COLORS.O;
            html += `<span class="entity-tag" style="background:${color}">${word}</span>`;
        });
        
        html += '</div>';
        return html;
    }
    
    // Визуализация структуры процесса
    visualizeStructure() {
        if (this.structure.length === 0) {
            return '<p class="empty-state">No structure found</p>';
        }
        
        let html = '<ul class="structure-list">';
        
        this.structure.forEach(item => {
            const typeClass = item.type ? item.type.toLowerCase() : 'other';
            html += `
                <li class="structure-item ${typeClass}">
                    <span>${item.word}</span>
                    <span class="type-badge">${item.type || 'OTHER'}</span>
                </li>
            `;
        });
        
        html += '</ul>';
        return html;
    }
    
    // Построение матрицы взаимодействий
    buildInteractionMatrix() {
        const agents = this.structure
            .filter(item => item.type === 'AGENT')
            .map(item => item.word);
        
        if (agents.length < 2) {
            return { agents: [], matrix: [] };
        }
        
        // Подсчет переходов
        const freq = {};
        for (let i = 0; i < agents.length - 1; i++) {
            const from = agents[i];
            const to = agents[i + 1];
            if (from !== to) {
                const key = `${from}->${to}`;
                freq[key] = (freq[key] || 0) + 1;
            }
        }
        
        // Уникальные агенты
        const uniqueAgents = [...new Set(agents)];
        
        // Создание матрицы
        const matrix = Array(uniqueAgents.length).fill().map(() => 
            Array(uniqueAgents.length).fill(0)
        );
        
        // Заполнение матрицы
        for (let i = 0; i < uniqueAgents.length; i++) {
            for (let j = 0; j < uniqueAgents.length; j++) {
                const key = `${uniqueAgents[i]}->${uniqueAgents[j]}`;
                if (freq[key]) {
                    matrix[i][j] = freq[key];
                }
            }
        }
        
        return {
            agents: uniqueAgents,
            matrix: matrix
        };
    }
    
    // Визуализация матрицы взаимодействий
    visualizeMatrix(matrixData) {
        if (matrixData.agents.length === 0) {
            return '<p class="empty-state">No agent interactions found</p>';
        }
        
        let html = '<table class="matrix-table">';
        
        // Заголовок
        html += '<tr><th></th>';
        matrixData.agents.forEach(agent => {
            html += `<th title="${agent}">${this.truncateText(agent, 15)}</th>`;
        });
        html += '</tr>';
        
        // Данные
        matrixData.matrix.forEach((row, i) => {
            html += `<tr><th title="${matrixData.agents[i]}">${this.truncateText(matrixData.agents[i], 15)}</th>`;
            
            row.forEach((cell, j) => {
                const cellClass = cell > 0 ? 'has-value' : '';
                const title = `${matrixData.agents[i]} → ${matrixData.agents[j]}: ${cell}`;
                html += `<td class="${cellClass}" title="${title}">${cell}</td>`;
            });
            
            html += '</tr>';
        });
        
        html += '</table>';
        return html;
    }
    
    // Создание тепловой карты с Plotly
    createHeatmap(matrixData) {
        if (matrixData.agents.length === 0) {
            return null;
        }
        
        const trace = {
            z: matrixData.matrix,
            x: matrixData.agents,
            y: matrixData.agents,
            type: 'heatmap',
            colorscale: 'YlOrRd',
            showscale: true,
            hoverongaps: false
        };
        
        const layout = {
            title: 'Agent Interaction Heatmap',
            xaxis: { 
                title: 'To Agent',
                tickangle: -45 
            },
            yaxis: { 
                title: 'From Agent' 
            },
            width: 400,
            height: 400,
            margin: { t: 50, r: 20, b: 100, l: 100 }
        };
        
        return { trace, layout };
    }
    
    // Создание Sankey диаграммы
    createSankey(matrixData) {
        if (matrixData.agents.length === 0) {
            return null;
        }
        
        // Подготавливаем данные для Sankey
        const sources = [];
        const targets = [];
        const values = [];
        const labels = matrixData.agents;
        
        for (let i = 0; i < matrixData.matrix.length; i++) {
            for (let j = 0; j < matrixData.matrix[i].length; j++) {
                if (matrixData.matrix[i][j] > 0) {
                    sources.push(i);
                    targets.push(j);
                    values.push(matrixData.matrix[i][j]);
                }
            }
        }
        
        if (sources
