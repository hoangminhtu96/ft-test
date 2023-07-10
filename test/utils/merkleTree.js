
function genMerkleTree(whiteList) {
  const merkleTree = {
    leaves: null,
    root: null
  }
  const leaves = []
  whiteList.forEach((data, index) => {
    const hash = buildHash(data, index)
    const node = {
      hash,
      parent: null,
    }
    leaves.push(node)
  })
  merkleTree.leaves = leaves
  merkleTree.root = buildMerkleTree(leaves)
  return merkleTree
}

function buildMerkleTree(leaves) {
  const numLeaves = leaves.length
  if (numLeaves === 1) {
    return leaves[0]
  }
  const parents = []
  let i = 0
  while (i < numLeaves) {
    const leftChild = leaves[i]
    const rightChild = i + 1 < numLeaves ? leaves[i + 1] : leftChild
    parents.push(createParent(leftChild, rightChild))
    i += 2
  }
  return buildMerkleTree(parents)
}

function createParent(leftChild, rightChild) {
  const hash = leftChild.hash < rightChild.hash ? buildHash(leftChild.hash, rightChild.hash) : buildHash(rightChild.hash, leftChild.hash)
  const parent = {
    hash,
    parent: null,
    leftChild,
    rightChild
  }
  leftChild.parent = parent
  rightChild.parent = parent
  // console.log(`left: ${leftChild.hash}`)
  // console.log(`right: ${rightChild.hash}`)
  // console.log(`parent: ${parent.hash}`)
  return parent
}

// data = address, index
function getMerklePath(merkleTree, ...data) {
  const hash = buildHash(...data)
  for (let i = 0; i < merkleTree.leaves.length; i++) {
    const leaf = merkleTree.leaves[i]
    if (leaf.hash === hash) {
      return generateMerklePath(merkleTree.root.hash, leaf)
    }
  }
}

function generateMerklePath(rootHash, node, path = []) {
  if (node.hash === rootHash) {
    return path
  }
  const isLeft = (node.parent.leftChild === node)
  if (isLeft) {
    path.push(node.parent.rightChild.hash)
  } else {
    path.push(node.parent.leftChild.hash)
  }
  return generateMerklePath(rootHash, node.parent, path)
}

function buildHash(...data) {
  return web3.utils.soliditySha3(...data)
}

module.exports = {
  genMerkleTree,
  getMerklePath
}
