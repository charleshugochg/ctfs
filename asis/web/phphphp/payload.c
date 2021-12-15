#include <stdlib.h>

static void before_main(void) __attribute__((constructor));

static void before_main(void)
{
    system("echo hi > hi.txt");
}
