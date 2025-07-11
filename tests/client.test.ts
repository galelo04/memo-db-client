import { it, describe } from 'node:test'
import { createClient } from '../src/client.js'
import assert from 'node:assert/strict'



describe('init testing', () => {
  const client = createClient()
  describe('testing set and get', () => {
    it('set() should return OK', async () => {
      const setData = await client.set('hello', 'testing')
      assert.strictEqual(setData, 'OK')
    })
    it('get("hello") should return testing', async () => {
      const getData = await client.get('hello');
      assert.strictEqual(getData, 'testing')
    })
  })
  describe('testing set and del and get', () => {
    it('set() should return OK', async () => {
      const setData = await client.set('hello', 'testing')
      assert.strictEqual(setData, 'OK')
    })
    it('del("hello") should return 1', async () => {
      const delData = await client.del(['hello']);
      assert.strictEqual(delData, 1)
    })
    it('get("hello") shuold return null', async () => {
      const getData = await client.get("hello")
      assert.strictEqual(getData, null)
    })
  })
  describe('del multible keys', () => {
    it('del() should return 3', async () => {
      await client.set('hello1', 'testing')
      await client.set('hello2', 'testing')
      await client.set('hello3', 'testing')
      const delData = await client.del(['hello1', 'hello2', 'hello3'])
      assert.strictEqual(delData, 3)
    })
  })
})
