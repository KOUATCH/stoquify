import { revalidatePath, revalidateTag } from 'next/cache'
import { logger } from '@/lib/logger'
import { revalidateAfterCommit } from '../cache-revalidation'
jest.mock('next/cache', () => ({ revalidatePath: jest.fn(), revalidateTag: jest.fn() }))
jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn() } }))
it('continues independent invalidations without leaking cache errors or failing on logging', () => {
  ;(revalidateTag as jest.Mock).mockImplementationOnce(() => { throw new Error('private payload') })
  ;(logger.warn as jest.Mock).mockImplementationOnce(() => { throw new Error('logger unavailable') })
  expect(() => revalidateAfterCommit({ tags: ['one', 'two'], paths: ['/page', { path: '/layout', type: 'layout' }] })).not.toThrow()
  expect(revalidateTag).toHaveBeenCalledTimes(2)
  expect(revalidatePath).toHaveBeenCalledWith('/page', 'page')
  expect(revalidatePath).toHaveBeenCalledWith('/layout', 'layout')
  expect(JSON.stringify((logger.warn as jest.Mock).mock.calls)).not.toContain('private payload')
})
