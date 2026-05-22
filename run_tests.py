import unittest
from test_evaluator import TestSafeEvaluator

if __name__ == '__main__':
    with open('test_results.txt', 'w') as f:
        f.write("Executing SafeEvaluator Unit Tests...\n\n")
        suite = unittest.TestLoader().loadTestsFromTestCase(TestSafeEvaluator)
        runner = unittest.TextTestRunner(stream=f, verbosity=2)
        result = runner.run(suite)
        f.write("\n")
        f.write(f"Tests Run: {result.testsRun}\n")
        f.write(f"Was Successful: {result.wasSuccessful()}\n")
        f.write(f"Failures: {len(result.failures)}\n")
        f.write(f"Errors: {len(result.errors)}\n")
