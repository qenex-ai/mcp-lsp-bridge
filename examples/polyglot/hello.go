package main

import "fmt"

type Greeting struct {
    Message string
}

func (g *Greeting) Say() {
    fmt.Println(g.Message)
}

func main() {
    g := &Greeting{Message: "Hello Golang"}
    g.Say()
}
