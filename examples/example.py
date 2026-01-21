"""Example Python file for testing LSP functionality"""


def greet(name: str) -> str:
    """
    Generate a greeting message.

    Args:
        name: The name to greet

    Returns:
        A greeting message
    """
    return f"Hello, {name}!"


def calculate_sum(numbers: list[int]) -> int:
    """
    Calculate the sum of a list of numbers.

    Args:
        numbers: List of integers to sum

    Returns:
        The sum of all numbers
    """
    return sum(numbers)


class Calculator:
    """A simple calculator class"""

    def __init__(self):
        self.result = 0

    def add(self, value: int) -> int:
        """Add a value to the current result"""
        self.result += value
        return self.result

    def multiply(self, value: int) -> int:
        """Multiply the current result by a value"""
        self.result *= value
        return self.result

    def reset(self) -> None:
        """Reset the calculator"""
        self.result = 0


# Test the functions
if __name__ == "__main__":
    message = greet("World")
    print(message)

    numbers = [1, 2, 3, 4, 5]
    total = calculate_sum(numbers)
    print(f"Sum: {total}")

    calc = Calculator()
    # Try getting completions after the dot: calc.
