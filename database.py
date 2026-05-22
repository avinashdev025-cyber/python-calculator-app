from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone

# Initialize db, will be bound to the Flask app inside app.py
db = SQLAlchemy()

class CalculationHistory(db.Model):
    """
    SQLAlchemy model representing the history of expressions evaluated by the calculator.
    """
    __tablename__ = 'calculation_history'
    
    id = db.Column(db.Integer, primary_key=True)
    expression = db.Column(db.String(255), nullable=False)
    result = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    def to_dict(self):
        """
        Convert the record to a dictionary representation.
        """
        return {
            'id': self.id,
            'expression': self.expression,
            'result': self.result,
            'created_at': self.created_at.isoformat()
        }
