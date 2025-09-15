import { hashPassword } from '@/utils/auth.utils';
import { db } from './index';
import * as schema from './schema';

async function seed() {
    await db.insert(schema.todos).values([
        {
            title: 'J.R.R. Tolkien',
            description: 'The creator of Middle-earth and author of The Lord of the Rings.',
        },
        {
            title: 'George R.R. Martin',
            description: 'The author of the epic fantasy series A Song of Ice and Fire.',
        },
        {
            title: 'J.K. Rowling',
            description: 'The creator of the Harry Potter series.',
        },
    ]);

    await db.insert(schema.users).values([
        {
            name: 'Axel Galea',
            email: 'axel.w.galea@gmail.com',
            password: await hashPassword('2202@@)@'),
            role: 'admin',
        },
    ]);
}

async function main() {
    try {
        await seed();
        console.log('Seeding completed');
    } catch (error) {
        console.error('Error during seeding:', error);
        process.exit(1);
    }
}

main();
