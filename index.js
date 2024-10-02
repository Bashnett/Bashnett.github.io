var num = document.querySelectorAll(".navtitle").length;

      for (var i = 0; i < num; i++) {
        document
          .querySelectorAll("button")
          [i].addEventListener("click", function () {
            var a = this.innerText.slice(0, 1);
            console.log(a);
            display(a);
          });
      }
      function display(hoe) {
        switch (hoe) {
          case "H":
            document.querySelector(
              ".contains"
            ).innerHTML = `<section class="content">
      <h1>Welcome to my Security Blogs</h1>
      <P>&ensp;&ensp;You can find Boxes walkthrough and writeups in here.</P>
      <h3>About me</h3>
      <p>
        &ensp;&ensp;My name is <strong>Anish Basnet</strong>. I am a Security Researcher with a strong background in testing Network and  Web applications.
      </p>
      <p style="font-size: 22px">
        <h2>Skills</h2>
        <ul>
            <li>Blackbox security testing of Web-application and WebAPIs OWASP TOP TEN vulnerabilities.</li>
            <li>Network service penetration testing, including testing of Active Directory, SMTP, FTP and other network protocols. Focused on identifying misconfigurations, privilege escalation, and weak access controls.</li>
            <li>Linux Server Administration focusing on secure configurations, patch management, and monitoring for performance and security.</li>
            <li>Hands on experience with many tools like Metasploit, Nmap, Netexec, Burpsuite & many others for network and WebApplication Assessment.</li>
            <li>Proficient in Python, Bash, and JavaScript for automating tasks, creating security tools, and developing scripts for vulnerability testing and server management.</li>
        </ul>
      </p>
      <h2>Discover</h2>
      <div>
        <iframe width="600" height="355" src='https://www.youtube.com/embed/mYGATOADlbY' frameborder='0' allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture' allowfullscreen></iframe>
        <iframe width="600" height="355" src='https://www.youtube.com/embed/RrpaWe5FLY0' frameborder='0' allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture' allowfullscreen></iframe>
      </div>
    </section>`;
            break;
          case "V":
            document.querySelector(".contains").innerHTML = `
      <section class="content">
      <h1>Vulnerable Boxes</h1>
      <p style="font-size: 22px">
        <span class="has-inline-color has-white-color"><strong>Video Walkthrough</strong></span>
      </p>
      <div>
        <iframe width="1260" height="715" src='https://www.youtube.com/embed/mYGATOADlbY' frameborder='0' allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture' allowfullscreen></iframe>
        <br></br>
        <br></br>
        <iframe width="1260" height="715" src='https://www.youtube.com/embed/RrpaWe5FLY0' frameborder='0' allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture' allowfullscreen></iframe>
        <br></br>
        <br></br>
        <iframe width="1260" height="715" src='https://www.youtube.com/embed/eMo6yBfw06Y' frameborder='0' allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture' allowfullscreen></iframe>
    </div>
    </section>
      `;
      break;
      case "C":
        document.querySelector(".contains").innerHTML=`
        <section class="content">
      <p style="font-size: 22px">
        <span class="has-inline-color has-white-color"><strong>CTFs</strong></span>
      <div>
        <iframe width="560" height="315" src='https://www.youtube.com/embed/gMIbIAKJ75s' frameborder='0' allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture' allowfullscreen></iframe>
        </div>
    </section>`;
    break;
    case "B":
        document.querySelector(".contains").innerHTML=`
        <section class="content">
      <h1>Bug Bounty Report Writeups</h1>
      <p style="font-size: 22px">
        <span class="has-inline-color has-white-color">Will be Updated after Findings..</span>
      </p>
    </section>`;
        break;
    case "W":
        document.querySelector(".contains").innerHTML=`
        <section class="content">
      <h1>Web-Sacrifice</h1>
      <p style="font-size: 22px">
        <span class="has-inline-color has-white-color">Web-Sacrifice is Intentional Vulnerable Web-Application features labs for vulnerabilities like XSS, CSRF, SQLi, NOSQLi and Broken Authentication Vulnerabilities.
        You can get it from here:</span>
        <span><a href="https://github.com/Bashnett/WEBSACRIFICE">Web-Sacrifice</a></span>
      </p>
    </section>`;
        break;
        }
      }
