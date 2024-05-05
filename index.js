var num = document.querySelectorAll(".navtitle").length;

      for (var i = 0; i < num; i++) {
        document
          .querySelectorAll("button")
          [i].addEventListener("click", function () {
            var a = this.innerText.slice(0, 1);
            display(a);
          });
      }
      function display(hoe) {
        switch (hoe) {
          case "H":
            document.querySelector(
              ".contains"
            ).innerHTML = `<section class="content">
      <h1>Welcome to my Offensive Blogs</h1>
      <P>&ensp;&ensp;You can find Bug Report writeups, Boxes walkthrough and information about me in here.</P>
      <h3>About me</h3>
      <p>
        &ensp;&ensp;My name is <strong>Anish Basnet</strong>. I am a Security Researcher with a strong background in testing Network and  Web applications. Throughout the past two months, I have focused on performing vulnerability assessments on many companies through their bug bounty program.
      </p>
      <p style="font-size: 22px">
        <span class="has-inline-color has-white-color"><strong>Skills</strong></span>
        <ul>
            <li>Vulnerability Assessment and Penetration Testing of WebApplication and Network System.</li>
            <li>Linux System Administration.</li>
            <li>Coding in Javascript and Python</li> 
            <li>Proficient in Bash and Powershell.</li>
            <li>Active Directory security audit.</li>
            <li>Working and security knowledge of Linux and Windows.</li>
            <li>Proficient in English and Nepali languages.</li>
        </ul>
      </p>
      <h2>Discover</h2>
      <div>
        <iframe width="500" height="355" src='https://www.youtube.com/embed/mYGATOADlbY' frameborder='0' allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture' allowfullscreen></iframe>
        <iframe width="500" height="355" src='https://www.youtube.com/embed/RrpaWe5FLY0' frameborder='0' allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture' allowfullscreen></iframe>
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
