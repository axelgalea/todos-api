export const config = {
    API_URL: String(Bun.env.API_URL),
    ELECTRIC_URL: String(Bun.env.ELECTRIC_URL),
    JWT_SECRET: Bun.env.JWT_SECRET ?? '2202',
    JWT_EXPIRATION_IN_MINUTES: Number(Bun.env.JWT_EXPIRATION_IN_MINUTES) ?? 5,
    JWT_REFRESH_EXPIRATION_IN_DAYS: Number(Bun.env.JWT_REFRESH_EXPIRATION_IN_DAYS) ?? 7,
};
