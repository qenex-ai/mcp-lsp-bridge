struct Greeter {
    message: String,
}

impl Greeter {
    fn new(msg: &str) -> Greeter {
        Greeter { message: msg.to_string() }
    }

    fn say_hello(&self) {
        println!("{}", self.message);
    }
}

fn main() {
    let g = Greeter::new("Hello Rust");
    g.say_hello();
}
