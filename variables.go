package main

import "fmt"

var someName = "hello"

func main() {
	// strings
	var nameOne string = "mario";
	var nameTwo = "luigi"; // type infered as string
	var nameThree string

	nameThree = "bowser"

	fmt.Println(nameOne)
	fmt.Println(nameTwo)
	fmt.Println(nameOne, nameThree, nameThree)

	nameFour := "yoshi" // automatically infers string.
	fmt.Println(nameFour)

	// integeres
	var ageOne int = 20
	var ageTwo = 30
	ageThree := 40

	fmt.Println(ageOne, ageTwo, ageThree)

	// bits & memory
	var numOne int8 = 25
	var numTwo int8 = -128
	var numThree uint8 = 25

}
