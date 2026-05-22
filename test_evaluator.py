import unittest
from evaluator import SafeEvaluator

class TestSafeEvaluator(unittest.TestCase):
    """
    Unit tests for verification of SafeEvaluator logic, mathematical operations,
    boundary constraints, math errors, and security safeguards.
    """
    
    def setUp(self):
        self.evaluator = SafeEvaluator()

    def test_basic_math(self):
        self.assertEqual(self.evaluator.evaluate("2 + 3"), 5)
        self.assertEqual(self.evaluator.evaluate("10 - 4"), 6)
        self.assertEqual(self.evaluator.evaluate("3 * 4"), 12)
        self.assertEqual(self.evaluator.evaluate("12 / 3"), 4)
        self.assertEqual(self.evaluator.evaluate("10 % 3"), 1)
        self.assertEqual(self.evaluator.evaluate("2 ** 3"), 8)

    def test_negative_and_decimal(self):
        self.assertEqual(self.evaluator.evaluate("-5 + 2"), -3)
        self.assertEqual(self.evaluator.evaluate("3.5 * 2"), 7)
        self.assertEqual(self.evaluator.evaluate("1.5 + -2.5"), -1)

    def test_order_of_operations(self):
        self.assertEqual(self.evaluator.evaluate("2 + 3 * 4"), 14)
        self.assertEqual(self.evaluator.evaluate("(2 + 3) * 4"), 20)
        self.assertEqual(self.evaluator.evaluate("2 * (3 + 4) ** 2"), 98)

    def test_scientific_functions(self):
        self.assertEqual(self.evaluator.evaluate("sqrt(16)"), 4)
        self.assertEqual(self.evaluator.evaluate("abs(-10)"), 10)
        self.assertEqual(self.evaluator.evaluate("sin(90)"), 1)
        self.assertEqual(self.evaluator.evaluate("cos(0)"), 1)
        self.assertEqual(self.evaluator.evaluate("tan(45)"), 1)
        self.assertEqual(self.evaluator.evaluate("log(100)"), 2)
        self.assertAlmostEqual(self.evaluator.evaluate("ln(2.718281828459)"), 1, places=5)

    def test_domain_errors(self):
        with self.assertRaises(ZeroDivisionError):
            self.evaluator.evaluate("5 / 0")
        with self.assertRaises(ValueError):
            self.evaluator.evaluate("sqrt(-4)")
        with self.assertRaises(ValueError):
            self.evaluator.evaluate("log(0)")
        with self.assertRaises(ValueError):
            self.evaluator.evaluate("log(-10)")
        with self.assertRaises(OverflowError):
            self.evaluator.evaluate("99999 ** 99999")

    def test_security_rejections(self):
        # Ensure arbitrary imports, code declarations, assignments, or unapproved structures fail
        with self.assertRaises(TypeError):
            self.evaluator.evaluate("__import__('os').system('ls')")
        with self.assertRaises(ValueError):
            self.evaluator.evaluate("x = 5")
        with self.assertRaises(ValueError):
            self.evaluator.evaluate("def f(): pass")
        with self.assertRaises(NameError):
            self.evaluator.evaluate("unknown_var + 5")
        with self.assertRaises(TypeError):
            self.evaluator.evaluate("'hello' + 'world'")

if __name__ == '__main__':
    unittest.main()
