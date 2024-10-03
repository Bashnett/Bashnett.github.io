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
            <h1>My Offensive Security Blogs</h1>
            <P>&ensp;&ensp;You can find Boxes walkthrough, ctfs, security information blogs and writeups in here.</P>
    
            <h2>Discover</h2>
            <div>
              <iframe width="1000" height="455" src='https://www.youtube.com/embed/RrpaWe5FLY0' frameborder='0' allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture' allowfullscreen class="iframe"></iframe>
            </div>
            <br /><br /><br />
            <h1>Web-Sacrifice (Intentional Vulnerable Web-application)</h1>
            <p style="font-size: 19px">
              <span class="has-inline-color has-white-color"
                >&ensp;&ensp;Web-Sacrifice is Intentional Vulnerable Web-Application
                features labs for vulnerabilities like XSS, CSRF, SQLi, NOSQLi and
                Broken Authentication Vulnerabilities. It is made using node and
                distributed via dockerized container. You can learn about Web
                Application penetration testing and information security knowledge
                using Web-sacrifice. <br /><br />You can get it from here:</span
              >
              <span
                ><a href="https://github.com/Bashnett/WEBSACRIFICE"
                  >Web-Sacrifice</a
                ></span
              >
            </p>
          </section>`;
            break;
          case "V":
            document.querySelector(".contains").innerHTML = `
      <section class="content">
      <p style="font-size: 22px">
        <span class="has-inline-color has-white-color"><strong>Vulnerable Boxes Walkthrough</strong></span>
      </p>
      <div>
        <iframe width="1160" height="515" src='https://www.youtube.com/embed/mYGATOADlbY' frameborder='0' allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture' allowfullscreen class="iframe"></iframe>
        <br></br>
        <br></br>
        <iframe width="1160" height="515" src='https://www.youtube.com/embed/RrpaWe5FLY0' frameborder='0' allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture' allowfullscreen class="iframe"></iframe>
        <br></br>
        <br></br>
        <iframe width="1160" height="515" src='https://www.youtube.com/embed/eMo6yBfw06Y' frameborder='0' allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture' allowfullscreen class="iframe"></iframe>
        <br></br>
        <iframe width="1160" height="515" src='https://www.youtube.com/embed/gMIbIAKJ75s' frameborder='0' allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture' allowfullscreen class="iframe"></iframe>
    </div>
    </section>
      `;
      break;
    case "O":
      window.location.href = "/offensive-blog.html";
        break;
        case "P":
          window.location.href = "/pwned-box.html";
          break;
        }
      }
