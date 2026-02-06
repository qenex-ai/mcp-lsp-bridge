#include <iostream>
#include <string>

class Greeter {
public:
    std::string message;

    Greeter(std::string msg) : message(msg) {}

    void sayHello() {
        std::cout << message << std::endl;
    }
};

int main() {
    Greeter g("Hello C++");
    g.sayHello();
    return 0;
}
