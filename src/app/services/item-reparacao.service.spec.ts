import { TestBed } from '@angular/core/testing';

import { ItemReparacaoService } from './item-reparacao.service';

describe('ItemReparacaoService', () => {
  let service: ItemReparacaoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ItemReparacaoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
