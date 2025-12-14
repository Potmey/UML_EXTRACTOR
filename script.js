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
        
        if (sources.length === 0) {
            return null;
        }
        
        const trace = {
            type: "sankey",
            orientation: "h",
            node: {
                pad: 15,
                thickness: 20,
                line: {
                    color: "black",
                    width: 0.5
                },
                label: labels,
                color: labels.map((_, i) => 
                    `hsl(${(i * 360) / labels.length}, 70%, 50%)`
                )
            },
            link: {
                source: sources,
                target: targets,
                value: values
            }
        };
        
        const layout = {
            title: "Resource Flow Diagram",
            font: { size: 10 },
            width: 800,
            height: 400
        };
        
        return { trace, layout };
    }
    
    // Вспомогательная функция для обрезки текста
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    const extractor = new BPMNExtractor();
    const inputText = document.getElementById('inputText');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const loadExampleBtn = document.getElementById('loadExample');
    const clearTextBtn = document.getElementById('clearText');
    const copyPlantUMLBtn = document.getElementById('copyPlantUML');
    const downloadDiagramBtn = document.getElementById('downloadDiagram');
    const loadingDiv = document.getElementById('loading');
    
    // Пример текста по умолчанию
    const exampleText = `The customer submits a refund request, the support agent reviews the request and if the request is valid, the finance department approves the refund, the system processes the payment, the customer receives a confirmation email else the support agent informs the customer.`;
    
    // Устанавливаем пример текста
    inputText.value = exampleText;
    
    // Загрузка примера
    loadExampleBtn.addEventListener('click', function() {
        inputText.value = exampleText;
    });
    
    // Очистка текста
    clearTextBtn.addEventListener('click', function() {
        inputText.value = '';
        clearResults();
    });
    
    // Копирование PlantUML кода
    copyPlantUMLBtn.addEventListener('click', function() {
        const plantUMLCode = document.getElementById('plantUMLCode');
        if (plantUMLCode.textContent) {
            navigator.clipboard.writeText(plantUMLCode.textContent)
                .then(() => {
                    showNotification('PlantUML code copied to clipboard!');
                })
                .catch(err => {
                    console.error('Failed to copy:', err);
                    showNotification('Failed to copy to clipboard', 'error');
                });
        }
    });
    
    // Скачивание диаграммы
    downloadDiagramBtn.addEventListener('click', function() {
        const plantUMLImage = document.querySelector('#plantUMLImage img');
        if (plantUMLImage && plantUMLImage.src) {
            const link = document.createElement('a');
            link.href = plantUMLImage.src;
            link.download = 'bpmn-diagram.svg';
            link.click();
        } else {
            showNotification('No diagram available to download', 'warning');
        }
    });
    
    // Анализ текста
    analyzeBtn.addEventListener('click', async function() {
        const text = inputText.value.trim();
        
        if (!text) {
            showNotification('Please enter some text to analyze.', 'warning');
            return;
        }
        
        // Показать индикатор загрузки
        loadingDiv.style.display = 'block';
        analyzeBtn.disabled = true;
        
        // Имитация обработки (в реальности мгновенная)
        setTimeout(() => {
            try {
                const results = extractor.analyzeText(text);
                displayResults(results);
                showNotification('Analysis completed successfully!', 'success');
            } catch (error) {
                console.error('Error:', error);
                showNotification('Error: ' + error.message, 'error');
            } finally {
                // Скрыть индикатор загрузки
                loadingDiv.style.display = 'none';
                analyzeBtn.disabled = false;
            }
        }, 500); // Небольшая задержка для UX
    });
    
    // Функция отображения результатов
    function displayResults(results) {
        // 1. Извлеченные сущности
        document.getElementById('entitiesResult').innerHTML = results.entitiesHtml;
        
        // 2. Структура процесса
        document.getElementById('structureResult').innerHTML = results.structureHtml;
        
        // 3. PlantUML код и диаграмма
        const plantUMLCode = document.getElementById('plantUMLCode');
        const plantUMLImage = document.getElementById('plantUMLImage');
        
        plantUMLCode.textContent = results.plantuml;
        
        plantUMLImage.innerHTML = `
            <div class="diagram-container">
                <img src="${results.plantumlUrl}" 
                     alt="BPMN Diagram" 
                     style="max-width: 100%; height: auto;"
                     onerror="this.onerror=null; this.src='https://via.placeholder.com/800x400?text=Diagram+Failed+to+Load'">
            </div>
        `;
        
        // 4. Матрица взаимодействий
        const matrixData = results.interactionMatrix;
        const matrixHtml = extractor.visualizeMatrix(matrixData);
        document.getElementById('matrixResult').innerHTML = matrixHtml;
        
        // 5. Heatmap
        const heatmapData = extractor.createHeatmap(matrixData);
        const heatmapDiv = document.getElementById('heatmapResult');
        
        if (heatmapData) {
            heatmapDiv.innerHTML = '<div id="heatmapPlot" class="heatmap-container"></div>';
            Plotly.newPlot('heatmapPlot', [heatmapData.trace], heatmapData.layout);
        } else {
            heatmapDiv.innerHTML = '<p class="empty-state">No data for heatmap</p>';
        }
        
        // 6. Sankey диаграмма
        const sankeyData = extractor.createSankey(matrixData);
        const sankeyDiv = document.getElementById('sankeyResult');
        
        if (sankeyData) {
            sankeyDiv.innerHTML = '<div id="sankeyPlot" style="width: 100%; height: 400px;"></div>';
            Plotly.newPlot('sankeyPlot', [sankeyData.trace], sankeyData.layout);
        } else {
            sankeyDiv.innerHTML = '<p class="empty-state">No data for flow diagram</p>';
        }
    }
    
    // Функция очистки результатов
    function clearResults() {
        document.getElementById('entitiesResult').innerHTML = 
            '<p class="empty-state">Entities will appear here after analysis</p>';
        document.getElementById('structureResult').innerHTML = 
            '<p class="empty-state">Process structure will appear here</p>';
        document.getElementById('plantUMLCode').textContent = '';
        document.getElementById('plantUMLImage').innerHTML = '';
        document.getElementById('matrixResult').innerHTML = 
            '<p class="empty-state">Interaction matrix will appear here</p>';
        document.getElementById('heatmapResult').innerHTML = 
            '<p class="empty-state">Heatmap will appear here</p>';
        document.getElementById('sankeyResult').innerHTML = 
            '<p class="empty-state">Flow diagram will appear here</p>';
    }
    
    // Функция показа уведомлений
    function showNotification(message, type = 'info') {
        // Создаем уведомление
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 
                              type === 'error' ? 'exclamation-circle' : 
                              type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Добавляем стили
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#10b981' : 
                         type === 'error' ? '#ef4444' : 
                         type === 'warning' ? '#f59e0b' : '#3b82f6'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Удаляем через 3 секунды
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    // Добавляем CSS анимации для уведомлений
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    // Автоматический анализ примера при загрузке
    analyzeBtn.click();
});
