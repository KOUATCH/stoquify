# A Level Notes: Computer Architecture

## 1. Computer Organization vs Computer Architecture

Computer organization refers to the physical components from which a computer is built, such as the CPU, memory, buses, input devices, and output devices.

Computer architecture refers to how those components are designed and connected to achieve performance, functionality, and efficiency.

A simple comparison:

| Area | Meaning |
|---|---|
| Computer organization | The actual hardware components and how they operate |
| Computer architecture | The design and structure that allows the components to work together effectively |

Organization is like the building materials. Architecture is like the design of the house.

## 2. Basic Computer System

A computer is an electronic device that accepts input, processes data, stores data, and produces output according to stored instructions.

The two main parts of a computer system are:

| Component | Meaning |
|---|---|
| Hardware | Physical parts of the computer, such as CPU, memory, keyboard, mouse, monitor, and storage devices |
| Software | Programs that tell the hardware what to do |

All computer functions can be grouped into four main categories:

| Function | Meaning |
|---|---|
| Data processing | Performing arithmetic or logical operations on data |
| Data storage | Keeping data temporarily or permanently |
| Data movement | Transferring data between CPU, memory, input, output, and storage |
| Control | Coordinating all operations of the computer system |

## 3. Important Basic Terms

| Term | Meaning |
|---|---|
| Input | Data or instructions entered into a computer |
| Data | Raw facts, symbols, numbers, text, sounds, or images |
| Information | Processed data that has meaning |
| Output | Results produced by the computer |
| Processing | Manipulation of data to produce useful information |
| Memory | Temporary storage used during processing |
| Storage | Long-term storage for data and programs |
| Peripheral device | External or additional device connected to a computer, such as printer, scanner, keyboard, or mouse |
| Network | Two or more computers connected to share data, programs, and resources |

## 4. Evolution of Computers

Computers developed through several generations, each based on a major technology improvement.

| Generation | Period | Main Technology | Key Features |
|---|---:|---|---|
| First generation | 1945-1955 | Vacuum tubes | Stored-program concept, magnetic tape and core memory, assembly language |
| Second generation | 1955-1965 | Transistors | Smaller, faster, less power consumption, high-level languages such as FORTRAN |
| Third generation | 1965-1975 | Integrated circuits | Multiprogramming, pipelining, operating systems, cache memory, virtual memory |
| Fourth generation | 1975-1985 | Microprocessors | Personal computers, laptops, networks, microprocessor-based systems |
| Modern generation | 1985-present | VLSI and advanced ICs | GHz processors, mobile computing, cloud computing, AI, e-commerce, high-speed networks |

VLSI means Very Large Scale Integration. It allows many electronic circuits to be placed on a single chip.

## 5. Types of Computers

Computers can be classified according to speed, cost, computational power, size, and application.

| Type | Description | Example Use |
|---|---|---|
| Desktop computer | General-purpose personal computer | Office work, education, home use |
| Notebook/laptop | Portable personal computer | Mobile work, study, presentations |
| Workstation | More powerful than a normal PC | Engineering, CAD, CAM, graphics |
| Mainframe/enterprise system | Large system for many users and large data processing | Banks, insurance, government, large organizations |
| Server | Provides services or data to other computers | Websites, databases, file sharing |
| Supercomputer | Extremely fast computer for complex calculations | Weather forecasting, aircraft design, military, scientific simulations |
| Handheld/PDA | Small portable battery-powered computer | Calendar, notes, address book, simple applications |

## 6. Functional Units of a Computer

A computer has five main functional units:

| Unit | Function |
|---|---|
| Input unit | Accepts data from the outside world and converts it into binary form |
| Output unit | Converts processed binary results into a human-readable form |
| Memory unit | Stores programs, data, and results |
| Central Processing Unit | Executes instructions and controls computer operations |
| Bus structure | Transfers data, addresses, and control signals between components |

Basic diagram:

```text
Input -> CPU <-> Memory -> Output
          |
       Control
          |
         ALU
```

## 7. Input Unit

The input unit accepts data and instructions from the user or external devices. It converts them into binary form, which the computer can understand.

Examples:

- Keyboard
- Mouse
- Scanner
- Joystick
- Microphone

## 8. Output Unit

The output unit converts binary results from the computer into a form understandable by humans.

Examples:

- Monitor
- Printer
- Speakers
- Projector
- LED/LCD display

## 9. Central Processing Unit

The CPU is the brain of the computer. It is responsible for executing instructions and controlling the activities of the computer.

The CPU contains:

| CPU Part | Function |
|---|---|
| ALU | Performs arithmetic and logical operations |
| Control Unit | Coordinates and controls all CPU operations |
| Registers | Very fast temporary storage locations inside the CPU |

### Arithmetic Logic Unit

The ALU performs:

- Addition
- Subtraction
- Multiplication
- Division
- AND, OR, NOT operations
- Comparison operations such as greater than, less than, and equal to

### Control Unit

The Control Unit:

- Fetches instructions from memory
- Decodes instructions
- Sends control signals to other parts of the computer
- Coordinates execution using the processor clock

### Registers

Registers are very fast temporary storage locations inside the CPU.

Important CPU registers:

| Register | Full Name | Function |
|---|---|---|
| PC | Program Counter | Holds the address of the next instruction to be fetched |
| IR | Instruction Register | Holds the instruction currently being executed |
| MAR | Memory Address Register | Holds the address of a memory location to be accessed |
| MDR | Memory Data Register | Holds data read from or written to memory |
| ACC | Accumulator | Stores intermediate arithmetic and logic results |

## 10. Processor Clock

The processor clock provides timing signals that control CPU operations. Each basic step of an operation may take one clock cycle.

Higher clock speed usually means the CPU can perform more cycles per second, but performance also depends on instruction design, memory speed, cache, buses, and processor architecture.

## 11. Memory

Memory stores data, instructions, and results.

There are two broad classes of storage:

| Class | Meaning |
|---|---|
| Primary memory | Main memory directly accessible by the CPU |
| Secondary storage | Long-term mass storage |

### Primary Memory

| Type | Description |
|---|---|
| RAM | Read/write memory, temporary, volatile |
| ROM | Read-only memory, permanent, non-volatile |

RAM is used to hold programs and data currently being processed.

ROM stores instructions or programs that do not normally change, such as firmware.

### Secondary Storage

Secondary storage is used for permanent or bulk storage.

Examples:

- Hard disk
- Solid-state drive
- CD-ROM
- DVD
- USB flash drive
- Magnetic tape

## 12. Stored Program Concept

The stored program concept means that both program instructions and data are stored in the same main memory.

This idea is associated with John von Neumann.

The CPU fetches instructions from memory one at a time, decodes them, and executes them.

## 13. Fetch-Decode-Execute Cycle

The CPU repeatedly performs the fetch-decode-execute cycle.

Steps:

1. The Program Counter holds the address of the next instruction.
2. The address is copied from PC to MAR.
3. The memory location is selected using the address bus.
4. The instruction is read from memory into MDR.
5. The instruction is transferred from MDR to IR.
6. The instruction in IR is decoded.
7. The required operands are fetched from registers or memory.
8. The ALU or other unit executes the operation.
9. The result is stored in a register, memory, or output device.
10. The PC is updated to point to the next instruction.

Register transfer sequence:

```text
PC -> MAR
Memory[MAR] -> MDR
MDR -> IR
Decode IR
Execute instruction
PC -> next instruction
```

The cycle continues until a halt instruction or an interrupt occurs.

## 14. Interrupts

An interrupt is a request for service from an I/O device or another part of the system.

When an interrupt occurs:

1. The CPU temporarily stops the current program.
2. Important values such as PC and registers are saved.
3. The CPU executes an Interrupt Service Routine.
4. After the service routine is complete, the saved state is restored.
5. The interrupted program continues.

Interrupts allow the CPU to respond quickly to events without constantly checking devices.

## 15. Bus Structure

A bus is a group of wires used to transfer information between components.

The CPU and memory are usually connected by three buses:

| Bus | Direction | Function |
|---|---|---|
| Address bus | Usually unidirectional | Carries the address of a memory or I/O location from CPU |
| Data bus | Bidirectional | Carries data between CPU, memory, and I/O devices |
| Control bus | Bidirectional | Carries control signals such as read, write, and interrupt |

### Address Bus

The address bus carries address bits from the processor to memory or I/O devices.

If there are `x` address lines, the number of addressable locations is:

```text
2^x
```

Example:

```text
3 address lines can address 2^3 = 8 locations.
```

### Data Bus

The data bus carries actual data. It is bidirectional because data can move from CPU to memory and from memory to CPU.

### Control Bus

The control bus carries signals such as:

- Read
- Write
- Interrupt
- Clock
- Reset
- Memory request
- I/O request

### Single-Bus and Multi-Bus Systems

| Structure | Advantage | Disadvantage |
|---|---|---|
| Single bus | Simple and cheap | Slower because all transfers share one bus |
| Multi-bus | Faster because multiple transfers can occur | More expensive and complex |

## 16. Memory Locations and Addresses

Main memory is a collection of storage locations. Each location has a unique address.

Important terms:

| Term | Meaning |
|---|---|
| Bit | Smallest unit of data, 0 or 1 |
| Byte | 8 bits |
| Word | Group of bits processed as one unit |
| Address | Unique identifier of a memory location |
| Address space | Total number of addressable memory locations |

A word may be 8 bits, 16 bits, 32 bits, or 64 bits.

If a word is 8 bits, it is called a byte.

Formula:

```text
Number of locations = 2^n
n = number of address bits
```

Example 1:

```text
32 MB = 2^25 bytes
Therefore, 25 bits are needed to address each byte.
```

Example 2:

```text
128 MB = 2^27 bytes
Word size = 8 bytes = 2^3 bytes
Number of words = 2^27 / 2^3 = 2^24
Therefore, 24 bits are needed to address each word.
```

## 17. Endianness

Endianness describes how bytes of a multi-byte value are stored in memory.

| Type | Meaning |
|---|---|
| Little endian | Least significant byte is stored at the lowest memory address |
| Big endian | Most significant byte is stored at the lowest memory address |

Example for 32-bit data:

```text
Data: 46 78 96 54
```

In little endian, the lowest address stores `54`.

In big endian, the lowest address stores `46`.

Endianness matters when transferring binary data between different machines.

## 18. Aligned and Unaligned Words

An aligned word starts at an address that matches its size.

Examples:

| Word Size | Aligned Addresses |
|---|---|
| 16-bit word | 0, 2, 4, 6, ... |
| 32-bit word | 0, 4, 8, 12, ... |
| 64-bit word | 0, 8, 16, 24, ... |

If a word starts at any arbitrary byte address, it is unaligned.

Aligned access is usually faster.

## 19. Memory Operations

There are two basic memory operations:

| Operation | Also Called | Meaning |
|---|---|---|
| Read | Load or fetch | Contents of a memory location are copied to the CPU |
| Write | Store | Data from the CPU is written into a memory location |

Both instructions and data are stored in memory.

## 20. Register Transfer Notation

Register Transfer Notation, or RTN, describes data movement between registers, memory, and I/O devices.

Rules:

- Register names and memory names are written in uppercase.
- Square brackets mean contents of a location.
- The right-hand side is the source.
- The left-hand side is the destination.
- Source contents are not modified.
- Destination contents are overwritten.

Examples:

```text
R2 <- [LOCN]
```

This means the contents of memory location `LOCN` are copied into register `R2`.

```text
R4 <- [R3] + [R2]
```

This means the contents of `R3` and `R2` are added, and the result is stored in `R4`.

## 21. Assembly Language Notation

Assembly language uses mnemonics to represent machine instructions.

Examples:

```text
MOVE LOCN, R2
ADD R3, R2, R4
```

An assembler converts assembly language into machine-level language.

## 22. Types of Programming Languages and Translators

| Term | Meaning |
|---|---|
| Machine language | Binary instructions directly understood by the CPU |
| Assembly language | Low-level language using mnemonics |
| High-level language | English-like programming language, such as FORTRAN, C, Java, Python |
| Assembler | Converts assembly language into machine code |
| Compiler | Converts a complete high-level language program into machine code |
| Interpreter | Converts and executes high-level language statements one by one |
| System software | Software that helps run and manage the computer |
| Operating system | System software that controls and coordinates computer activities |

## 23. Instruction Set Architecture

Instruction Set Architecture, or ISA, is the complete set of instructions that a processor can execute.

Four basic instruction categories:

| Category | Examples |
|---|---|
| Data transfer | LOAD, STORE, MOVE |
| Arithmetic and logic | ADD, SUB, AND, OR, NOT |
| Program sequencing and control | JUMP, BRANCH, CALL, RETURN |
| I/O transfer | INPUT, OUTPUT |

## 24. Instruction Formats

Instructions may use different numbers of addresses.

### Three-Address Instruction

Syntax:

```text
Operation source1, source2, destination
```

Example:

```text
ADD D, E, F
```

Meaning:

```text
F <- D + E
```

Advantage: One instruction can perform the complete operation.

Disadvantage: Instruction code may be long.

### Two-Address Instruction

Syntax:

```text
Operation source, destination
```

Example:

```text
MOVE B, C
ADD A, C
```

Meaning:

```text
C <- B
C <- A + C
```

### One-Address Instruction

One operand is specified, and the other is implied to be the accumulator.

Example:

```text
LOAD D
ADD E
STORE F
```

Meaning:

```text
ACC <- D
ACC <- ACC + E
F <- ACC
```

### Zero-Address Instruction

Operands are not specified explicitly. They are usually taken from a stack.

Stack-based machines use push and pop operations.

## 25. Basic Instruction Cycle

The basic instruction cycle is:

1. Fetch instruction from memory.
2. Decode instruction.
3. Locate operands.
4. Fetch operands if needed.
5. Execute operation.
6. Store result.
7. Fetch the next instruction.

## 26. Straight-Line Sequencing

Straight-line sequencing occurs when instructions are fetched and executed one after another from consecutive memory addresses.

Example:

```text
MOVE A, R0
ADD B, R0
MOVE R0, C
```

This calculates:

```text
C <- A + B
```

## 27. Branching

Branching changes the normal sequence of instruction execution.

| Branch Type | Meaning |
|---|---|
| Conditional branch | Branch occurs only if a condition is true |
| Unconditional branch | Branch always occurs |

Branches are used for:

- Loops
- If statements
- Function calls
- Repetition
- Decision-making

## 28. Condition Codes

The CPU uses condition code flags to record information about the result of an operation.

| Flag | Meaning |
|---|---|
| N | Set if the result is negative |
| Z | Set if the result is zero |
| V | Set if arithmetic overflow occurs |
| C | Set if a carry occurs from the most significant bit |

Conditional branch instructions use these flags.

## 29. Addressing Modes

Addressing modes describe how an instruction specifies the location of its operand.

### Immediate Addressing

The operand is given directly in the instruction.

Example:

```text
ADD #5
```

Advantage: Fast because no memory access is needed for the operand.

Disadvantage: Limited value range.

### Direct Addressing

The instruction contains the memory address of the operand.

Example:

```text
ADD A
```

Effective address:

```text
EA = A
```

Advantage: Simple.

Disadvantage: Limited address space.

### Indirect Addressing

The instruction contains the address of a memory location that holds the address of the operand.

Example:

```text
ADD (A)
```

Effective address:

```text
EA = [A]
```

Advantage: Larger address space.

Disadvantage: Slower because extra memory access is needed.

### Register Addressing

The operand is stored in a register.

Example:

```text
ADD R1
```

Advantage: Very fast.

Disadvantage: Limited number of registers.

### Register Indirect Addressing

The register contains the memory address of the operand.

Example:

```text
ADD (R1)
```

Effective address:

```text
EA = [R1]
```

Advantage: Faster than normal indirect addressing because the pointer is in a register.

### Indexed Addressing

The effective address is found by adding an offset to the contents of a register.

Example:

```text
ADD 20(R1), R2
```

Effective address:

```text
EA = 20 + [R1]
```

Useful for arrays and lists.

### Relative Addressing

The effective address is found by adding an offset to the Program Counter.

Effective address:

```text
EA = PC + offset
```

Commonly used in branch instructions.

### Auto-Increment Addressing

The register points to the operand. After accessing the operand, the register is automatically increased.

Example:

```text
ADD (R2)+, R0
```

Useful for processing arrays from beginning to end.

### Auto-Decrement Addressing

The register is first decreased, then used as the address of the operand.

Example:

```text
ADD -(R2), R0
```

Useful for stacks and reverse list processing.

## 30. Addressing Architecture Types

| Architecture | Description |
|---|---|
| Memory-to-memory | ALU operations can use operands directly in memory |
| Register-to-register | ALU operations occur only between registers |
| Register-to-memory | One operand may be in memory and another in a register |
| Single accumulator | Uses one main register called accumulator |
| Stack architecture | Uses stack operations; operands are implicit |

## 31. RISC and CISC

### RISC

RISC means Reduced Instruction Set Computer.

Features:

- Simple instructions
- Most instructions execute in one clock cycle
- Fixed-length instruction format
- Few addressing modes
- Large number of registers
- Load/store architecture
- Hardwired control unit
- Highly suitable for pipelining

Examples:

- ARM processors
- Some mobile device processors

### CISC

CISC means Complex Instruction Set Computer.

Features:

- Complex instructions
- Variable-length instruction format
- Many addressing modes
- Instructions may access memory directly
- Smaller register file
- Often uses microprogrammed control
- Some instructions take many clock cycles

Examples:

- Intel x86
- Motorola 68000
- VAX
- PDP-11

## 32. RISC vs CISC Comparison

| Feature | RISC | CISC |
|---|---|---|
| Instruction complexity | Simple | Complex |
| Number of instructions | Few | Many |
| Instruction length | Fixed | Variable |
| Addressing modes | Few | Many |
| Memory access | Mainly load and store | Many instructions can access memory |
| Registers | Many | Fewer |
| Control unit | Hardwired | Often microprogrammed |
| Pipelining | Easier | More difficult |
| Code size | Usually larger | Usually smaller |
| Cycles per instruction | Usually fewer | Usually more |

Performance idea:

```text
CISC tries to reduce the number of instructions per program.
RISC tries to reduce the number of cycles per instruction.
```

## 33. Performance Factors

Computer performance is affected by:

- Clock speed
- Number of instructions executed
- Type of instructions used
- Average time required to execute an instruction
- Memory access time
- Cache memory
- Bus width and transfer rate
- Number and type of I/O devices
- Power dissipation
- Pipelining
- Processor architecture

Simple performance relationship:

```text
CPU time depends on:
instruction count,
cycles per instruction,
and clock cycle time.
```

## 34. Common Exam Questions and Answer Points

### Explain the difference between computer organization and computer architecture.

Computer organization deals with hardware units and how they operate. Computer architecture deals with the design and structure of the system, including how components are integrated for performance and functionality.

### State the main functional units of a computer.

Input unit, output unit, memory unit, CPU, and bus structure.

### What is the function of the Program Counter?

The Program Counter holds the address of the next instruction to be fetched from memory.

### What is the function of MAR and MDR?

MAR holds the address of the memory location to be accessed. MDR holds the data being transferred to or from memory.

### Describe the fetch-decode-execute cycle.

The CPU fetches an instruction from memory, decodes it to determine the operation, fetches any required operands, executes the operation, stores the result, and updates the Program Counter.

### What is an interrupt?

An interrupt is a request for CPU attention, usually from an I/O device. The CPU pauses the current program, runs an interrupt service routine, and then resumes the original program.

### What are the three main buses?

Address bus, data bus, and control bus.

### What is an addressing mode?

An addressing mode is the method used by an instruction to specify where its operand is located.

### Compare RISC and CISC.

RISC uses simple, fixed-length instructions, few addressing modes, many registers, and is easy to pipeline. CISC uses complex, variable-length instructions, many addressing modes, fewer registers, and often uses microprogrammed control.

## 35. Quick Revision Summary

- Computer organization is about hardware components.
- Computer architecture is about system design and performance.
- The CPU contains the ALU, Control Unit, and registers.
- PC holds the next instruction address.
- IR holds the current instruction.
- MAR holds a memory address.
- MDR holds memory data.
- The fetch-decode-execute cycle is the basic CPU operation cycle.
- The address bus carries addresses.
- The data bus carries data.
- The control bus carries control signals.
- Memory read means data moves from memory to CPU.
- Memory write means data moves from CPU to memory.
- Address space depends on the number of address bits.
- Little endian stores the least significant byte first.
- Big endian stores the most significant byte first.
- Branching changes normal instruction order.
- Condition flags include N, Z, V, and C.
- RISC uses simple instructions and many registers.
- CISC uses complex instructions and many addressing modes.

