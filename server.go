package main

import (
	"bufio"
	"fmt"
	"io"
	"log"
	"net"
	"strings"
	"time"
	"os"
)

var memstore map[string]interface{}

var events chan Event

type Event struct {
	cmd Command
	Response chan string
}

func main() {
	// in memory store.
	memstore = make(map[string]interface{})
	events = make(chan Event, 10)

	go eventLoop()

	restoreMemStore()

	PORT := ":4141"
	l, err := net.Listen("tcp4", PORT)
	if err != nil {
		log.Fatal(err)
	}

	defer l.Close()

	fmt.Println("Server is listening for requests on", PORT)

	for {
		c, err := l.Accept()
		if err != nil {
			fmt.Println(err)
			return
		}
		go handleConnection(c)
	}
}

func eventLoop() {
	for event := range events {
		// fmt.Println("Received event on event loop")
		fmt.Println("[Event Loop]", event.cmd.cmdStr)
		response := strings.TrimSpace(event.cmd.Execute())
		fmt.Println("[Event Loop]", response)
		event.Response <- response
	}
}

func sendEvent(cmd Command) string {
	resp := make(chan string)
	// fmt.Println("pushing event to event queue")
	events <- Event{cmd: cmd, Response: resp}
	return <- resp
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

		command := parseCommand(cmdLine)

		response := sendEvent(command)
		result := []byte(response + "\n")

		c.Write(result)
		fmt.Printf("[%s]: Response %s\n", c.RemoteAddr().String(), response)

		go appendWriteToLog(command)
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


func (c Command) Persist() {
	fields := strings.Fields(c.cmdStr)
	if len(fields) == 0 {
		return
	}

	operation := strings.ToLower(fields[0])
	operation = strings.Trim(operation, "\x00")

	switch operation {
		case "set":
			if len(fields) != 3 {
				return
			}

			file, err := os.OpenFile("writes.aof", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)

			defer file.Close()

			if err != nil {
				fmt.Println(err)
				return
			}
			_, err = file.WriteString(fmt.Sprintf("[%s] %s", time.Now(), c.cmdStr))

			if err != nil {
				fmt.Println(err)
				return
			}

			fmt.Println("Appended to disk log")
			return
	}

	return
}

func parseCommand(cmdStr string) Command {
	return Command{cmdStr}
}

func appendWriteToLog(command Command) {
	command.Persist()
}

func restoreMemStore() {
	filename := "writes.aof"
	if _, err := os.Stat(filename); os.IsNotExist(err) {
		return
	}

	file, err := os.Open(filename)
	if err != nil {
		fmt.Printf("Error opening file: %v\n", err)
		return
	}

	fmt.Println("Restoring database from AOF log")

	defer file.Close()

	scanner := bufio.NewScanner(file)

	for scanner.Scan() {
		logLine := scanner.Text()

		fmt.Println(logLine)

		cmdLine := strings.Split(logLine, "] ")[1]
		command := parseCommand(cmdLine)
		response := sendEvent(command)

		fmt.Println(response)
	}

	if err := scanner.Err(); err != nil {
		log.Fatal(err)
	}
}