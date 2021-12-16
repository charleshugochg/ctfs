#include <stdio.h>
#include <stdlib.h>

int
main()
{
  int i = 0;
  scanf("%d", &i);
  system("/bin/sh");
  return 0;
}
