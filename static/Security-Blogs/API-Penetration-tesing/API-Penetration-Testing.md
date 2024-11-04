## JWT Token

    This is example of jwt token
    eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGltZUBhc3MuY29tIiwiaWF0IjoxNzE4NzkwNDg2LCJleHAiOjE3MTg4NzY4ODZ9.Ycl9S18qgIEvLRoiKleeMFFSOdH-i0oGxoGvkLpFRH4vaSgQuxKGnDIy2lLNk70DlU8VZOTqx1n6alNeTtxfPQ

We can distinguish it from the use of ey at the begining of token and fullstop
It is divided into three section
Header, Body and signature
body consist of important information, using jwt.io

![2.png](/static/Security-Blogs/API-Penetration-tesing/JWT/2.png)

jwt tool also can be used to see it:

![2.png](/static/Security-Blogs/API-Penetration-tesing/JWT/3.png)

These are the technique we can use to attack jwt token

- using no algorithm as we can see in above pic we are using algorithm but we can use no algorithm technique to attack some and it will be vulnerble if it is not patched
  like this,
  `jwt_tool token -X a`
  ![2.png](/static/Security-Blogs/API-Penetration-tesing/JWT/4.png)
  and it will create token which we can test whether we can use it or not

- We can scan for any misconfiguration by simulating playbook via jwt_tool:

  ```
  jwt_tool -t http://crapi.apisec.ai/identity/api/v2/user/dashboard -rh "Authorization: Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhcGltZUBhc3MuY29tIiwiaWF0IjoxNzE4NzY3NTYzLCJleHAiOjE3MTg4NTM5NjN9." -M pb
  ```

  ![2.png](/static/Security-Blogs/API-Penetration-tesing/JWT/5.png)

- Algorithm switch attack

  There is a chance the API provider isn’t checking the JWTs properly. If this is the case, we may be able to trick a provider into accepting a JWT with an altered algorithm. One of the first things you should attempt is sending a JWT without including the signature. This can be done by erasing the signature altogether and leaving the last period in place, like none attack above, if it is accepted then we can use another algorithm like this:

```
jwt_tool eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ1c2VyYWFhQGVtYWlsLmNvbSIsImlhdCI6MTY1ODg1NTc0MCwiZXhwIjoxNjU4OTQyMTQwfQ._EcnSozcUnL5y9SFOgOVBMabx_UAr6Kg0Zym-LH_zyjReHrxU_ASrrR6OysLa6k7wpoBxN9vauhkYNHepOcrlA -X k -pk public-key-pem
```

- JWT Crack Attack

  The JWT Crack attack attempts to crack the secret used for the JWT signature hash, giving us full control over the process of creating our own valid JWTs.
  first lets create password list of all combination of alphabet character 5 length long using crunch:

  ![2.png](/static/Security-Blogs/API-Penetration-tesing/JWT/6.png)

  - then use it in jwt_tool to crack secret:

  ![2.png](/static/Security-Blogs/API-Penetration-tesing/JWT/1.png)
