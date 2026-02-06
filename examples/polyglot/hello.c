#include <stdio.h>

struct Greeter {
    const char* message;
};

void say_hello(struct Greeter* g) {
    printf("%s\n", g->message);
}

int main() {
    struct Greeter g = { "Hello C" };
    say_hello(&g);
    return 0;
}
