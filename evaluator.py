import ast
import operator
import math

class SafeEvaluator:
    """
    A secure math evaluator that parses input expressions into an Abstract Syntax Tree (AST)
    and evaluates nodes recursively. This completely avoids using Python's unsafe eval().
    """
    
    # Map AST binary operator nodes to Python operators
    BINARY_OPERATORS = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.Mod: operator.mod,
        ast.Pow: operator.pow,
    }
    
    # Map AST unary operator nodes to Python operators
    UNARY_OPERATORS = {
        ast.UAdd: operator.pos,
        ast.USub: operator.neg,
    }
    
    def evaluate(self, expression_str: str):
        """
        Parses and evaluates a math expression string.
        Returns a float or int.
        """
        if not expression_str or not expression_str.strip():
            raise ValueError("Expression is empty")
        
        # Strip trailing equals or whitespace
        clean_expr = expression_str.strip().rstrip('=')
        
        try:
            # Parse the expression in 'eval' mode (expects a single expression)
            node = ast.parse(clean_expr, mode='eval')
            result = self._eval(node.body)
            
            # Format the output to float/int
            if isinstance(result, float) and result.is_integer():
                return int(result)
            return result
        except ZeroDivisionError:
            raise ZeroDivisionError("Cannot divide by zero")
        except OverflowError:
            raise OverflowError("Result is too large (Overflow)")
        except Exception as e:
            # Catch other valuation or mathematical domain errors
            if isinstance(e, (ValueError, TypeError, NameError, ZeroDivisionError, OverflowError)):
                raise e
            raise ValueError(f"Invalid math expression: {str(e)}")

    def _eval(self, node):
        """
        Recursive helper to traverse the AST nodes.
        """
        # 1. Constant numbers (e.g. 5, 3.14)
        if isinstance(node, ast.Constant):
            if isinstance(node.value, (int, float)):
                return node.value
            raise TypeError(f"Unsupported constant type: {type(node.value).__name__}")
        elif hasattr(ast, 'Num') and isinstance(node, getattr(ast, 'Num')):  # Backwards compatibility for older Python versions
            return node.n
            
        # 2. Binary Operations (e.g. A + B, A ** B)
        elif isinstance(node, ast.BinOp):
            left = self._eval(node.left)
            right = self._eval(node.right)
            op_type = type(node.op)
            
            if op_type in self.BINARY_OPERATORS:
                # Security and safety bounds: avoid massive power calculations that freeze CPU
                if op_type == ast.Pow:
                    if abs(left) > 10000 and right > 100:
                        raise OverflowError("Power result is too large to compute")
                    if left == 0 and right < 0:
                        raise ZeroDivisionError("0 cannot be raised to a negative power")
                return self.BINARY_OPERATORS[op_type](left, right)
            raise TypeError(f"Unsupported binary operator: {op_type.__name__}")
            
        # 3. Unary Operations (e.g. -X, +X)
        elif isinstance(node, ast.UnaryOp):
            operand = self._eval(node.operand)
            op_type = type(node.op)
            
            if op_type in self.UNARY_OPERATORS:
                return self.UNARY_OPERATORS[op_type](operand)
            raise TypeError(f"Unsupported unary operator: {op_type.__name__}")
            
        # 4. Standard safe function calls (e.g. sqrt(X), sin(X))
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                func_name = node.func.id.lower()
                
                # Supported scientific functions
                # Convert degrees to radians for trigonometric functions to make it intuitive for users
                SAFE_FUNCTIONS = {
                    'sqrt': math.sqrt,
                    'sin': lambda x: math.sin(math.radians(x)),
                    'cos': lambda x: math.cos(math.radians(x)),
                    'tan': lambda x: math.tan(math.radians(x)),
                    'log': math.log10,
                    'ln': math.log,
                    'abs': abs
                }
                
                if func_name in SAFE_FUNCTIONS:
                    if len(node.args) != 1:
                        raise ValueError(f"Function '{func_name}' expects exactly 1 argument")
                    
                    arg_val = self._eval(node.args[0])
                    
                    # Validate domain constraints
                    if func_name == 'sqrt' and arg_val < 0:
                        raise ValueError("Square root of negative number is undefined")
                    if (func_name == 'log' or func_name == 'ln') and arg_val <= 0:
                        raise ValueError("Logarithm of zero/negative is undefined")
                    if func_name == 'tan' and abs(arg_val % 180) == 90:
                        raise ValueError("Tangent of 90/270 degrees is undefined")
                        
                    res = SAFE_FUNCTIONS[func_name](arg_val)
                    # Round floats to 12 decimal places to avoid floating point anomalies (e.g. cos(90) -> 0)
                    if isinstance(res, float):
                        res = round(res, 12)
                        if res.is_integer():
                            res = int(res)
                    return res
                raise NameError(f"Unsupported function call: '{func_name}'")
            raise TypeError("Function calls must be made by name")
            
        # 5. Variable references (e.g. x, unknown_var)
        elif isinstance(node, ast.Name):
            raise NameError(f"Variables are not supported: '{node.id}'")
            
        # 6. Reject everything else (e.g. variable assignments, system commands, strings, etc.)
        raise TypeError(f"Execution of AST node type '{type(node).__name__}' is blocked for security")
