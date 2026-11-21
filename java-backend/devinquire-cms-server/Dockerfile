FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY devinquire-cms-sdk/pom.xml devinquire-cms-sdk/
COPY devinquire-cms-server/pom.xml devinquire-cms-server/
COPY devinquire-cms-sdk/src devinquire-cms-sdk/src
COPY devinquire-cms-server/src devinquire-cms-server/src
RUN mvn -pl devinquire-cms-server -am clean package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/devinquire-cms-server/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
