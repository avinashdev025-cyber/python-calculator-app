import os
from flask import Flask, request, jsonify, render_template
from database import db, CalculationHistory
from evaluator import SafeEvaluator

app = Flask(__name__)

# Configure local SQLite database path within the instance folder
db_path = os.path.join(app.instance_path, 'history.db')
os.makedirs(app.instance_path, exist_ok=True)
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Bind database and instantiate custom safe evaluator
db.init_app(app)
evaluator = SafeEvaluator()

# Initialize tables inside application context
with app.app_context():
    db.create_all()

@app.route('/')
def index():
    """
    Render main Single-Page Web App template.
    """
    return render_template('index.html')

@app.route('/api/calculate', methods=['POST'])
def calculate():
    """
    Evaluate math expression sent via JSON POST.
    Persists evaluation in database history on success, unless request is a preview.
    """
    data = request.get_json() or {}
    expression = data.get('expression', '').strip()
    is_preview = data.get('preview', False)
    
    if not expression:
        return jsonify({'success': False, 'error': 'Expression is empty'}), 400
        
    try:
        result = evaluator.evaluate(expression)
        
        # Save to calculation database only if not a preview evaluation
        if not is_preview:
            record = CalculationHistory(expression=expression, result=str(result))
            db.session.add(record)
            db.session.commit()
        
        return jsonify({
            'success': True,
            'expression': expression,
            'result': result
        })
        
    except (ValueError, TypeError, NameError) as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except ZeroDivisionError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except OverflowError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': f"Unexpected server error: {str(e)}"}), 500

@app.route('/api/history', methods=['GET'])
def get_history():
    """
    Retrieve the list of the 20 most recent successful calculations.
    """
    try:
        records = CalculationHistory.query.order_by(CalculationHistory.created_at.desc()).limit(20).all()
        return jsonify({
            'success': True,
            'history': [r.to_dict() for r in records]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/history', methods=['DELETE'])
def clear_history():
    """
    Clear all records in the CalculationHistory table.
    """
    try:
        db.session.query(CalculationHistory).delete()
        db.session.commit()
        return jsonify({'success': True, 'message': 'History cleared successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    # Run development server on port 5000, fall back to environment variables for production
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
