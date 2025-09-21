package main

import (
	"bufio"
	"fmt"
	"io"
	"os"
	// "log"
	"strings"
	"net"
)

const HOST = "localhost"
const PORT = "4141"
const TYPE = "tcp"

func main() {

	conn, err := connectServer()

	if err != nil {
		fmt.Println("Error connecting to server", err)
		return
	}

	fmt.Println("Connected to ", HOST + ":" + PORT)

	defer conn.Close()

	inputLoop(conn)
}

func inputLoop(conn *net.TCPConn) {
	for {
		fmt.Printf("> ")
		scanner := bufio.NewScanner(os.Stdin)
		if scanner.Scan() {
			input := scanner.Text()

			fields := strings.Fields(input)

			if len(fields) == 0 {
				continue
			}

			if fields[0] == "exit" {
				return
			}

			makeRequest(conn, input)
		}

		if err := scanner.Err(); err != nil {
			fmt.Fprintln(os.Stderr, "Error reading input:", err)
		}
	}
}

func connectServer() (*net.TCPConn, error) {
	tcpServer, err := net.ResolveTCPAddr(TYPE, HOST + ":" + PORT)

	if err != nil {
		println("ResolveTCPAddr failed:", err.Error())
		return nil, err
	}

	fmt.Println(tcpServer)

	conn, err := net.DialTCP(TYPE, nil, tcpServer)
	if err != nil {
		println("Dial failed:", err.Error())
		return nil, err
	}

	return conn, nil
}

func makeRequest(conn *net.TCPConn, input string) {
	_, err := conn.Write([]byte(input + "\n"))

	if err != nil {
		println("Write data failed:", err.Error())
		return
	}

	// for {
	reader := bufio.NewReader(conn)
	resultLine, err := reader.ReadString('\n')
	if err != nil {
		if err == io.EOF {
			// break
			return
		}
		println("Read data failed:", err.Error())
		return
	}
	resultLine = strings.TrimSpace(strings.ReplaceAll(resultLine, "\\n", "\n"))
	fmt.Println(resultLine)
	// }
}
