FROM oven/bun:alpine AS base
WORKDIR /usr/src/app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# [optional] tests & build
ENV NODE_ENV=production
# RUN bun test
RUN bun build --compile --outfile=todos-api src/index.ts

# copy production dependencies and source code into final image
FROM alpine:latest AS release
RUN apk add --no-cache libstdc++ libgcc
COPY --from=prerelease /usr/src/app/todos-api ./todos-api
RUN chmod +x ./todos-api
RUN addgroup -S app && adduser -S app -G app
# run the app
USER app

EXPOSE 3000/tcp

CMD [ "./todos-api" ]
