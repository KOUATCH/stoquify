jest.mock('@/prisma/db',()=>({db:{auditLog:{create:jest.fn()}}}));
