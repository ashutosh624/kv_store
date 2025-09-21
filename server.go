package main

import (
	"bufio"
	"fmt"
	"io"
	"log"
	"net"
	"strings"
	"commands/command"
)

var memstore map[string]interface{}

func main() {
	// in memory store.
	memstore = make(map[string]interface{})

	PORT := ":4141"
	l, err := net.Listen("tcp4", PORT)
	if err != nil {
		log.Fatal(err)
	}

	defer l.Close()

	for {
		c, err := l.Accept()
		if err != nil {
			fmt.Println(err)
			return
		}
		go handleConnection(c)
	}
}

func handleConnection(c net.Conn) {
	fmt.Printf("[%s]: Client Connected\n", c.RemoteAddr().String())
	defer c.Close()
	reader := bufio.NewReader(c)

	for {
		cmdLine, err := reader.ReadString('\n')
		if err != nil {
			if err != io.EOF {
				fmt.Println("[%s]: read error: %s", c.RemoteAddr().String(), err)
			}
			fmt.Printf("[%s]: Client disconnected\n", c.RemoteAddr().String())
			break
		}

		fmt.Printf(cmdLine)

		command := parseCommand(cmdLine)
		response := strings.TrimSpace(command.Execute())

		result := []byte(response + "\n")

		c.Write(result)
		fmt.Printf("[%s]: Response %s\n", c.RemoteAddr().String(), response)
	}
}


type Command struct {
	cmdStr string
}

func (c Command) Execute() string {
	fields := strings.Fields(c.cmdStr)
	if len(fields) == 0 {
		return "Command Error"
	}

	operation := strings.ToLower(fields[0])
	operation = strings.Trim(operation, "\x00")

	switch operation {
		case "echo":
			return strings.Split(c.cmdStr, "echo ")[1]
		case "ping":
			return "PONG"
		case "keys":
			var response string
			for key := range memstore {
				response = response + key + "\\n"
			}
			return response
		case "get":
			if len(fields) != 2 {
				return "GET Syntax Error"
			}
			value, ok := memstore[fields[1]].(string)
			if ok {
				return string(value)
			}
			return "Key doesnot exist"
		case "set":
			if len(fields) != 3 {
				return "SET Command Error"
			}

			if memstore == nil {
				return "Memory Error"
			}
			
			memstore[fields[1]] = fields[2]

			return fields[2]
		default:
			return "Command Error"
	}

	return "Command Error"
}

func parseCommand(cmdStr string) Command {
	return Command{cmdStr}
}
