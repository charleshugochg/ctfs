# Write Up

## Challenge: **pbjar/2021/pwn/curve**

### Initial Research
---

`! first thing first`

```console
❯ file curve
curve: ELF 64-bit LSB shared object, x86-64, version 1 (SYSV), dynamically linked, interpreter ./ld-2.31.so, for GNU/Linux 3.2.0, BuildID[sha1]=e8fe3eece1912689d5e47acaf76c1dca070f4ad8, not strippe
```

```console
❯ pwn checksec curve
[*] '/home/whoami/ctfs/pbjar/pwn/curve/curve'
    Arch:     amd64-64-little
    RELRO:    Full RELRO
    Stack:    Canary found
    NX:       NX enabled
    PIE:      PIE enabled
```

`! everything is on`

`! ghidra time`

```c
undefined8 main(void)
{
  ...
  char local_98 [136];
  ...
  puts("Input 1:");
  read(0,local_98,0xb0);
  puts(local_98);
  ...
}
```

>! obviously, read is overflowing the stack by 0xb0-136=40 bytes

>! but canary says sorry

>! okay, let's see what puts can leak from the stack

```console
(gdb) x/22gx $rbp-0x90
0x7fffffffd890: 0x0000000000000000      0x0000000000000000
0x7fffffffd8a0: 0x0000000000000000      0x0000000000000000
0x7fffffffd8b0: 0x0000000000000000      0x0000000000000000
0x7fffffffd8c0: 0x0000000000000000      0x0000000000000000
0x7fffffffd8d0: 0x0000000000f0b5ff      0x00000000000000c2
0x7fffffffd8e0: 0x00007fffffffd907      0x0000555555555325
0x7fffffffd8f0: 0x0000000000000000      0x0000000000000000
0x7fffffffd900: 0x00005555555552e0      0x00005555555550b0
0x7fffffffd910: 0x00007fffffffda10      0xd6438ff453680d00
0x7fffffffd920: 0x00005555555552e0      0x00007ffff7e2cd0a
0x7fffffffd930: 0x00007fffffffda18      0x0000000100000000
```

! we can leak only one of these -
+ a stack address
+ an address where curve loaded
+ an address where libc loaded if we go through canary

? what else, and only else

```c
undefined8 main(void)
{
  ...
  char local_98 [136];
  ...
  __format = (char *)malloc(0x80);
  ...
  puts("Input 2:");
  read(0,local_98,0x80);

  puts("\nInput 3:");
  read(0,__format,0x80);
  printf(__format);
  free(__format);
  return 0
}
```

>? printf
>! this will allow us to leak the data from the stack
>! and to write the random locations where the data from the stack is pointed to
>! or if we combine with input 2, we can write an arbitrary location, as it's writing into the stack

### Thought flow
---
`! leak the stack address using input 1`

`! write the shell code and the main return address pointer into the stack using input 2`

`! modify the main return address on the stack with the shell code address using printf`

`! execution will be redirected`

```diff
+ stack address can be leaked
+ main return address pointer can be calculated
+ shell code and pointer can be combined
+ still can modify the main return address with a painful printf bandwidth, as we can only write one pointer on the stack
- unfortunately stack is not executable: FULL RELRO
```
`! we can still redirect the execution where ever we want`

`? any system call in the program`

`! not found`

`! wait we can't know any other address to jump if we need stack address for redirection`

`! stuck`

`! wait original return address might be useful`

`! oh, i can only modify a part of it`

`! that would allow to jump some special location with proper alignment`

`! let's see what is interesting there`

```console
(gdb) disas 0x00007ffff7e2cd0a
   ...
   0x00007ffff7e2cd03 <+227>:   mov    rax,QWORD PTR [rsp+0x10]
   0x00007ffff7e2cd08 <+232>:   call   rax
   0x00007ffff7e2cd0a <+234>:   mov    edi,eax
   0x00007ffff7e2cd0c <+236>:   call   0x7ffff7e44660 <exit>
   ...
(gdb) x/i $rsp+0x10
   0x555555555195 <main>:       push   rbp
```
`! interesting`

`! if we change the least significant byte of the return address from 0x..0a to 0x..03, the main will be called again`

`! perfect`

`! now we can leak everything from the memory with printf, as the program will not end`

`! the payload would be like "111%{}$hhn %{}$lx ..."`

`! the first format is to modify the return address and else to leak`

`? now what`
```diff
+ able to write to any amount of memory locations as we can loop back to mean
+ a libc address can be leaked
+ system address can be calculated
+ can redirect to system
- rdi needs to be loaded with string pointer pointed to "/{program_path}"
```

`? how to call system properly without shell code`

`! stuck`

`! oh wait, pop rdi; ret; will call the system cause we have full control of stack`

`! if we found those instructions on any loaded program by any chance, we can redirect to there with a crafted stack`

`! let's see the shell code of those instructions real quick`

```console
❯ echo -e "pop rdi\nret" > pop-rdi-ret.asm
❯ nasm -f elf64 pop-rdi-ret.asm
❯ objdump -d pop-rdi-ret.o
...
0000000000000000 <.text>:
   0:   5f                      pop    %rdi
   1:   c3                      retq
```

`! search for 0x5f 0xc3 in ghidra`

```console
        undefined __libc_csu_init()
...
        0010133a 41  5f           POP        R15
        0010133c c3              RET
```

`! it's in the csu init`

`! we can jump to 0x..3b instead of 0x..3a`

`! that will pop the rdi and return`

`! before return to there, stack format should be`

```
* rsp
| address_to_0x5f0xc3 | bin_sh_address | system_address |
```

```diff
+ __libc_csu_init address can be calculated from leaked address
+ /bin/sh can be written to heap
+ heap address is also leaked
```

`! perfect`

`! review` [exploit.py](exploit.py) `for implementation`