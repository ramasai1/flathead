// console.h
// ---------

#include "../src/jslite.h"

void console_log(JLARGS *);
void console_error(JLARGS *);
void console_time(JLARGS *);
void console_assert(JLARGS *);
JLVALUE * bootstrap_console(void);
