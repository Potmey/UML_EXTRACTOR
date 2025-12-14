from flask import Flask, render_template, request, jsonify
from bpmn_extractor import bpmn_extractor, resource_analyzer
import json

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        # Получаем текст из запроса
        data = request.get_json()
        text = data.get('text', '').strip()
        
        if not text:
            return jsonify({
                'success': False,
                'error': 'Please provide text to analyze'
            })
        
        # Выполняем анализ
        result = bpmn_extractor.build_bpmn(text)
        structure = result["structure"]
        
        # Визуализация сущностей
        entities_html = bpmn_extractor.visualize_entities(result["entities"])
        
        # Heatmap
        heatmap_img = resource_analyzer.visualize_heatmap(structure)
        
        # Sankey диаграмма
        sankey_html = resource_analyzer.visualize_sankey(structure)
        
        # Матрица взаимодействий
        agents, matrix = resource_analyzer.build_interaction_matrix(structure)
        
        # Форматируем матрицу для отображения
        matrix_formatted = []
        if len(matrix) > 0:
            for i in range(len(matrix)):
                row = []
                for j in range(len(matrix[i])):
                    row.append(float(matrix[i][j]))
                matrix_formatted.append(row)
        
        return jsonify({
            'success': True,
            'plantuml': result["plantuml"],
            'plantuml_url': result["url"],
            'entities_html': entities_html,
            'heatmap_img': heatmap_img,
            'sankey_html': sankey_html,
            'agents': agents,
            'matrix': matrix_formatted,
            'structure': structure
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/example', methods=['GET'])
def get_example():
    example_text = """The customer submits a refund request, the support agent reviews the request
and if the request is valid, the finance department approves the refund, the system processes the payment, the customer receives a confirmation email
else the support agent informs the customer."""
    
    return jsonify({
        'text': example_text
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
