#include <stdio.h>

struct data {
  char name[8];
  void (*func)();
  int num;
};

void print () {printf("print\n");};

int main()
{
  struct data d = {
    .name = "deadbeef",
    .func = print,
    .num = 10
  };
  d.func();
  return 0;
};
